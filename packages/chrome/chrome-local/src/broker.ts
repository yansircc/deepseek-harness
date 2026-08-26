/** Abort-aware single-connector command store for the local Chrome provider. */
import { randomUUID } from 'node:crypto'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  ChromeCommandId,
  type ChromeCommand,
  type ChromeCommandId as ChromeCommandIdType,
  type ChromeConnectorId,
  type ChromeJsonValue,
} from '@deepseek-ai/dsh-chrome-protocol'
import { ChromeError } from '@deepseek-ai/dsh-chrome'
import type { LateResultRecord, PublicConnector } from './types.ts'
import type { WireCommand, WireResult } from '@deepseek-ai/dsh-chrome-protocol'
import { extensionWireCommand } from './wire-command.ts'

interface Entry {
  readonly command: WireCommand
  readonly owner: Agent
  phase: 'queued' | 'claimed' | 'cancel-requested' | 'settled'
  claimedBy?: ChromeConnectorId
  resolve(value: ChromeJsonValue): void
  reject(error: unknown): void
  cleanup(): void
}

/** Command-store status used by provider health projection. */
export interface BrokerStatus {
  readonly queued: number
  readonly pending: number
  readonly current?: { readonly id: ChromeCommandIdType; readonly phase: 'claimed' | 'cancel-requested' }
}

/** One single-connector queue with explicit cancellation and late-result retention. */
export class LocalCommandBroker {
  private readonly entries = new Map<ChromeCommandIdType, Entry>()
  private readonly queue: ChromeCommandIdType[] = []
  private readonly late = new Map<ChromeCommandIdType, LateResultRecord>()
  private stopped = false
  private waiters = new Set<() => void>()

  constructor(private readonly maximum: number, private readonly deadlineMs: number) {}

  /** Submit one owner-scoped command and await its result.
   * @param owner - Exact initiating Agent.
   * @param command - Provider-neutral Chrome command.
   * @param signal - Caller cancellation signal.
   * @returns Connector result JSON.
   */
  send(owner: Agent, command: ChromeCommand, signal: AbortSignal): Promise<ChromeJsonValue> {
    signal.throwIfAborted()
    if (this.stopped) throw new ChromeError('Chrome provider is stopped', 'CHROME_PROVIDER_DISPOSING')
    if (this.entries.size >= this.maximum) throw new ChromeError('Chrome connector command queue is full', 'CHROME_COMMAND_REJECTED')
    const id = ChromeCommandId(randomUUID())
    const ownerId = owner.id
    const wire: WireCommand = extensionWireCommand(id, command, {
      key: `agent:${ownerId}`,
      groupTitle: 'DSH session',
      foreground: true,
    })
    return new Promise<ChromeJsonValue>((resolve, reject) => {
      let settled = false
      const finish = (): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
      }
      const entry: Entry = {
        command: wire,
        owner,
        phase: 'queued',
        resolve: (value) => { finish(); resolve(value) },
        reject: (error) => { finish(); reject(error) },
        cleanup: finish,
      }
      const abandon = (reason: 'abort' | 'timeout'): void => {
        const current = this.entries.get(id)
        if (!current || current.phase === 'settled') return
        this.entries.delete(id)
        if (current.phase === 'queued') {
          current.reject(reason === 'abort' ? signal.reason : new ChromeError('Chrome command timed out before delivery', 'CHROME_COMMAND_ABORTED'))
          return
        }
        current.phase = 'cancel-requested'
        this.wake()
        current.reject(new ChromeError('Chrome command may already have changed Chrome and will not be repeated', 'CHROME_COMMAND_OUTCOME_UNKNOWN'))
      }
      const abort = (): void => abandon('abort')
      const timer = setTimeout(() => abandon('timeout'), this.deadlineMs)
      signal.addEventListener('abort', abort, { once: true })
      this.entries.set(id, entry)
      this.queue.push(id)
      this.wake()
    })
  }

  /** Claim the next queued command, or report a cancellation intent.
   * @param connector - Authenticated connector.
   * @param waitMs - Poll deadline.
   * @returns Command, cancel intent, or idle response.
   */
  async next(connector: PublicConnector, waitMs: number): Promise<{ type: 'command'; command: WireCommand } | { type: 'cancel'; commandId: ChromeCommandIdType } | { type: 'none' }> {
    const deadline = Date.now() + waitMs
    while (!this.stopped && Date.now() < deadline) {
      const cancel = [...this.entries.values()].find(entry => entry.phase === 'cancel-requested' && entry.claimedBy === connector.connectorId)
      if (cancel) {
        cancel.phase = 'settled'
        this.entries.delete(cancel.command.id)
        return { type: 'cancel', commandId: cancel.command.id }
      }
      const id = this.queue.shift()
      if (id !== undefined) {
        const entry = this.entries.get(id)
        if (entry?.phase === 'queued') {
          entry.phase = 'claimed'
          entry.claimedBy = connector.connectorId
          return { type: 'command', command: entry.command }
        }
        continue
      }
      await new Promise<void>((resolve) => {
        const remaining = Math.max(1, Math.min(100, deadline - Date.now()))
        const timer = setTimeout(() => { this.waiters.delete(done); resolve() }, remaining)
        const done = (): void => { clearTimeout(timer); this.waiters.delete(done); resolve() }
        this.waiters.add(done)
      })
    }
    return { type: 'none' }
  }

  /** Accept a result, including late results after the caller stopped awaiting.
   * @param connector - Reporting connector.
   * @param result - Wire result.
   * @returns Acceptance disposition.
   */
  complete(connector: PublicConnector, result: WireResult): 'accepted' | 'late' | 'unknown' {
    const entry = this.entries.get(result.id)
    if (!entry) {
      this.late.set(result.id, { result, receivedAt: Date.now() })
      return 'late'
    }
    if (entry.claimedBy !== connector.connectorId || (entry.phase !== 'claimed' && entry.phase !== 'cancel-requested')) return 'unknown'
    entry.phase = 'settled'
    this.entries.delete(result.id)
    if (result.ok) entry.resolve(result.value)
    else if (result.error._tag === 'CommandRejected') {
      entry.reject(new ChromeError(result.error.message, 'CHROME_COMMAND_REJECTED'))
    } else {
      entry.reject(new ChromeError(result.error.message, 'CHROME_COMMAND_OUTCOME_UNKNOWN'))
    }
    return 'accepted'
  }

  /** Read a retained late result for diagnostics.
   * @param id - Command identity.
   * @returns Retained late result when present.
   */
  lateResult(id: ChromeCommandIdType): LateResultRecord | undefined { return this.late.get(id) }

  /** Current queue and executing-command counts.
   * @returns Secret-free broker status.
   */
  status(): BrokerStatus {
    const current = [...this.entries.values()].find(entry => entry.phase === 'claimed' || entry.phase === 'cancel-requested')
    return {
      queued: [...this.entries.values()].filter(entry => entry.phase === 'queued').length,
      pending: [...this.entries.values()].filter(entry => entry.phase !== 'queued').length,
      ...(current === undefined ? {} : { current: { id: current.command.id, phase: current.phase as 'claimed' | 'cancel-requested' } }),
    }
  }

  /** Stop admission and reject every outstanding operation. */
  async close(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    this.wake()
    const entries = [...this.entries.values()]
    this.entries.clear()
    this.queue.length = 0
    for (const entry of entries) {
      entry.reject(new ChromeError(
        entry.phase === 'queued' ? 'Chrome provider stopped before command delivery' : 'Chrome command outcome is unknown because the provider stopped',
        entry.phase === 'queued' ? 'CHROME_PROVIDER_DISPOSING' : 'CHROME_COMMAND_OUTCOME_UNKNOWN',
      ))
      entry.cleanup()
    }
  }

  private wake(): void {
    const waiters = this.waiters
    this.waiters = new Set()
    for (const resolve of waiters) resolve()
  }
}
