/**
 * Promise-based CommandBroker: the bridge's command mailbox. Ported from the
 * pi-chrome extension (`src/core/broker.ts`) with Effect primitives (Queue,
 * Deferred, Semaphore, SynchronizedRef) replaced by plain Promises.
 *
 * Command lifecycle:
 *   owner sends → pending(queued) → connector polls → pending(executing)
 *   → connector completes → resolve/reject the owner's promise
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/broker
 */

import { randomUUID } from 'node:crypto'
import {
  CommandRejected,
  CommandTimeout,
  CommandOutcomeUnknown,
  BridgeStopped,
  ConnectorOffline,
  type BridgeFailure,
} from './errors.ts'
import { MAX_ADMITTED_COMMANDS_PER_CONNECTOR, CONNECTOR_LEASE_DEADLINE_MS } from '../protocol/bridge-contract.ts'
import type {
  PublicConnector,
  SessionContext,
  WireCommand,
  WireDomainRequest,
  WireResult,
} from '../protocol/schema.ts'

export type BrokerStatus = {
  readonly connectorId: string
  readonly connected: boolean
  readonly queuedCommands: number
  readonly pendingCommands: number
  readonly lastSeenAt?: number
  readonly label?: string
  readonly extensionId?: string
  readonly extensionDisplayVersion?: string
  readonly protocolFingerprint?: string
}

type PendingPhase = 'queued' | 'executing' | 'completing'

interface Pending {
  command: WireCommand
  phase: PendingPhase
  claim?: { extensionId: string; protocolFingerprint: string }
  resolve: (value: unknown) => void
  reject: (error: BridgeFailure) => void
}

interface ConnectionState {
  connector: PublicConnector
  lastSeenAt: number
}

interface Mailbox {
  queue: WireCommand[]
  pending: Map<string, Pending>
  connection?: ConnectionState
  stopped: boolean
  /** Serializes the poll-claim path per connector. */
  deliveryChain: Promise<unknown>
  /** Serializes state transitions. */
  mutationChain: Promise<unknown>
}

interface BrokerState {
  mailboxes: Map<string, Mailbox>
  stopped: boolean
}

const shortId = (connectorId: string): string => connectorId.slice(0, 8)

const connectorBusy = (connectorId: string): CommandRejected =>
  new CommandRejected({
    code: 'connector-busy',
    message:
      `Chrome connector ${shortId(connectorId)} already has `
      + `${MAX_ADMITTED_COMMANDS_PER_CONNECTOR} admitted commands`,
  })

const phaseBucket = {
  queued: 'queuedCommands',
  executing: 'pendingCommands',
  completing: 'pendingCommands',
} as const satisfies Record<PendingPhase, keyof Pick<BrokerStatus, 'queuedCommands' | 'pendingCommands'>>

const commandCounts = (
  pending: ReadonlyMap<string, Pending>,
): Pick<BrokerStatus, 'queuedCommands' | 'pendingCommands'> =>
  [...pending.values()].reduce<Pick<BrokerStatus, 'queuedCommands' | 'pendingCommands'>>(
    (counts, command) => {
      const key = phaseBucket[command.phase]
      return { ...counts, [key]: counts[key] + 1 }
    },
    { queuedCommands: 0, pendingCommands: 0 },
  )

const emptyStatus = (connectorId: string): BrokerStatus => ({
  connectorId,
  connected: false,
  queuedCommands: 0,
  pendingCommands: 0,
})

export class CommandBroker {
  private constructor(private state: BrokerState) {}

  static async make(): Promise<CommandBroker> {
    return new CommandBroker({ mailboxes: new Map(), stopped: false })
  }

  /** Serialize one mailbox state transition behind the mailbox's mutation chain. */
  private withMailbox<T>(mailbox: Mailbox, fn: () => Promise<T> | T): Promise<T> {
    const prev = mailbox.mutationChain
    let result!: T
    const next = prev.then(
      async () => {
        result = await fn()
      },
      async () => {
        result = await fn()
      },
    )
    mailbox.mutationChain = next.catch(() => undefined)
    return next.then(() => result)
  }

  async register(connectorId: string): Promise<void> {
    if (this.state.stopped) return
    if (this.state.mailboxes.has(connectorId)) return
    this.state.mailboxes.set(connectorId, {
      queue: [],
      pending: new Map(),
      stopped: false,
      deliveryChain: Promise.resolve(),
      mutationChain: Promise.resolve(),
    })
  }

  async drop(connectorId: string): Promise<void> {
    if (this.state.stopped) return
    const mailbox = this.state.mailboxes.get(connectorId)
    if (!mailbox) return
    await this.stopMailbox(mailbox)
    this.state.mailboxes.delete(connectorId)
  }

  /**
   * Send one command to a bound connector and await its result.
   * @returns the command result value.
   * @throws BridgeFailure on rejection/timeout/offline.
   */
  async send(
    connectorId: string,
    request: WireDomainRequest,
    session: SessionContext,
    timeoutMs: number,
  ): Promise<unknown> {
    if (this.state.stopped) {
      throw new BridgeStopped('Chrome bridge is stopped')
    }
    const mailbox = this.state.mailboxes.get(connectorId)
    if (!mailbox || mailbox.stopped) {
      throw new ConnectorOffline(
        connectorId,
        `Bound Chrome connector ${shortId(connectorId)} is offline`,
      )
    }

    const id = randomUUID()
    const command: WireCommand = { id, ...request, session }
    const now = Date.now()

    // Reserve a pending slot.
    const reservation = await this.withMailbox(mailbox, () => {
      if (mailbox.stopped) return 'stopped' as const
      const connection = mailbox.connection
      if (!connection || now - connection.lastSeenAt >= CONNECTOR_LEASE_DEADLINE_MS) {
        return 'offline' as const
      }
      if (mailbox.pending.size >= MAX_ADMITTED_COMMANDS_PER_CONNECTOR) {
        return 'busy' as const
      }
      return 'reserved' as const
    })
    if (reservation === 'stopped') {
      throw new BridgeStopped('Chrome connector mailbox stopped')
    }
    if (reservation === 'offline') {
      throw new ConnectorOffline(
        connectorId,
        `Bound Chrome connector ${shortId(connectorId)} is offline`,
      )
    }
    if (reservation === 'busy') throw connectorBusy(connectorId)

    return new Promise<unknown>((resolve, reject) => {
      let settled = false
      const settleResolve = (value: unknown): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      }
      const settleReject = (error: BridgeFailure): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(error)
      }

      const pending: Pending = {
        command,
        phase: 'queued',
        resolve: settleResolve,
        reject: settleReject,
      }
      const timer = setTimeout(() => {
        void this.withMailbox(mailbox, () => {
          if (mailbox.stopped) return
          const current = mailbox.pending.get(id)
          if (!current || current.phase !== 'queued') {
            settleReject(
              new CommandOutcomeUnknown(
                `Chrome command ${id} was already delivered when the ${timeoutMs}ms reply deadline expired. It may have completed and will not be repeated.`,
                `the ${timeoutMs}ms reply deadline expired`,
              ),
            )
            return
          }
          mailbox.pending.delete(id)
          settleReject(
            new CommandTimeout(
              `Chrome command timed out before delivery after ${timeoutMs}ms`,
              timeoutMs,
            ),
          )
        })
      }, timeoutMs)

      void this.withMailbox(mailbox, () => {
        if (mailbox.stopped) {
          settleReject(new BridgeStopped('Chrome connector mailbox stopped'))
          return
        }
        mailbox.pending.set(id, pending)
        mailbox.queue.push(command)
      })
    })
  }

  /**
   * Connector poll: claim the next queued command for the given connector.
   * Returns undefined when the mailbox is stopped, idle, or timed out.
   */
  async next(
    connector: PublicConnector,
    timeoutMs: number,
    onConnected?: () => Promise<void>,
  ): Promise<WireCommand | undefined> {
    if (this.state.stopped) return undefined
    const mailbox = this.state.mailboxes.get(connector.connectorId)
    if (!mailbox || mailbox.stopped) return undefined
    const lastSeenAt = Date.now()
    const active = await this.withMailbox(mailbox, () => {
      if (mailbox.stopped) return false
      mailbox.connection = { connector, lastSeenAt }
      return true
    })
    if (!active) return undefined
    if (onConnected) await onConnected()

    const prev = mailbox.deliveryChain
    const run = prev.then(async (): Promise<WireCommand | undefined> => {
      const state = mailbox
      if (
        state.stopped ||
        [...state.pending.values()].some(({ phase }) => phase !== 'queued')
      ) {
        return undefined
      }
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        if (state.stopped) return undefined
        const command = state.queue.shift()
        if (command === undefined) {
          await new Promise(r => setTimeout(r, 50))
          continue
        }
        const claimed = await this.withMailbox(mailbox, () => {
          if (mailbox.stopped) return undefined
          const current = mailbox.pending.get(command.id)
          if (!current || current.phase !== 'queued') return undefined
          current.phase = 'executing'
          current.claim = {
            extensionId: connector.extensionId,
            protocolFingerprint: connector.protocolFingerprint,
          }
          return command
        })
        if (claimed) return claimed
      }
      return undefined
    })
    mailbox.deliveryChain = run.then(() => undefined, () => undefined)
    return run
  }

  /**
   * Connector completion: report a command result, resolving the owner.
   * @returns true when the result was accepted for a known executing command.
   */
  async complete(connector: PublicConnector, result: WireResult): Promise<boolean> {
    if (this.state.stopped) return false
    const mailbox = this.state.mailboxes.get(connector.connectorId)
    if (!mailbox || mailbox.stopped) return false
    const lastSeenAt = Date.now()
    const completion = await this.withMailbox(mailbox, () => {
      if (mailbox.stopped) return undefined
      const current = mailbox.pending.get(result.id)
      if (!current || current.phase !== 'executing') return undefined
      const claim = current.claim
      if (
        !claim ||
        claim.extensionId !== connector.extensionId ||
        claim.protocolFingerprint !== connector.protocolFingerprint
      ) {
        return undefined
      }
      current.phase = 'completing'
      mailbox.connection = { connector, lastSeenAt }
      return current
    })
    if (!completion) return false
    if (result.ok) {
      completion.resolve(result.value)
    } else if (result.error._tag === 'CommandRejected') {
      completion.reject(
        new CommandRejected({
          code: result.error.code,
          message: result.error.message,
          ...(result.error.details === undefined ? {} : { details: result.error.details }),
        }),
      )
    } else {
      completion.reject(
        new CommandOutcomeUnknown(result.error.message, result.error.cause),
      )
    }
    await this.withMailbox(mailbox, () => {
      mailbox.pending.delete(result.id)
    })
    return true
  }

  status(connectorId: string): BrokerStatus {
    if (this.state.stopped) return emptyStatus(connectorId)
    const mailbox = this.state.mailboxes.get(connectorId)
    if (!mailbox || mailbox.stopped) return emptyStatus(connectorId)
    const counts = commandCounts(mailbox.pending)
    if (!mailbox.connection) return { ...emptyStatus(connectorId), ...counts }
    const now = Date.now()
    return {
      connectorId: mailbox.connection.connector.connectorId,
      connected: now - mailbox.connection.lastSeenAt < CONNECTOR_LEASE_DEADLINE_MS,
      label: mailbox.connection.connector.label,
      extensionId: mailbox.connection.connector.extensionId,
      extensionDisplayVersion: mailbox.connection.connector.extensionDisplayVersion,
      protocolFingerprint: mailbox.connection.connector.protocolFingerprint,
      lastSeenAt: mailbox.connection.lastSeenAt,
      ...counts,
    }
  }

  async stop(): Promise<void> {
    if (this.state.stopped) return
    this.state.stopped = true
    const mailboxes = [...this.state.mailboxes.values()]
    this.state.mailboxes.clear()
    for (const mailbox of mailboxes) {
      await this.stopMailbox(mailbox)
    }
  }

  private async stopMailbox(mailbox: Mailbox): Promise<void> {
    const pending = await this.withMailbox(mailbox, () => {
      if (mailbox.stopped) return new Map<string, Pending>()
      const p = mailbox.pending
      mailbox.stopped = true
      mailbox.queue.length = 0
      return p
    })
    for (const { command, phase, reject } of pending.values()) {
      reject(
        phase !== 'queued'
          ? new CommandOutcomeUnknown(
            `Chrome command ${command.id} was already delivered when the connector mailbox stopped. It may have completed and will not be repeated.`,
            'the connector mailbox stopped',
          )
          : new BridgeStopped('Chrome bridge stopped before command delivery'),
      )
    }
  }
}
