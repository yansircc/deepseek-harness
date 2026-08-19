/**
 * Persistent ACP process pool for the Cursor subagent backend. One warm
 * `agent acp` server per model serves many delegations: each run acquires a
 * pooled connection, opens its own ACP session, and releases the connection
 * (best-effort `session/close`) when its turn settles. Idle connections are
 * reaped after a configurable TTL; a connection whose process or wire died is
 * evicted instead of reused. The pool is single-tenant per connection — at
 * most one active run session per connection — so Cursor-side session state
 * never interleaves; concurrency scales by pool size, not by multiplexing.
 *
 * @module @deepseek-ai/dsh-subagent-cursor/pool
 */

import { randomUUID } from 'node:crypto'
import { Readable as NodeReadable, Writable as NodeWritable } from 'node:stream'
import {
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Client as AcpClient,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type ToolKind,
} from '@agentclientprotocol/sdk'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'

/** How to auto-answer the child's `session/request_permission` prompts. */
export type PermissionPolicy = 'deny' | 'allowEdits' | 'allow'

/** Per-run handlers installed on a pooled connection while one session is active. */
export interface ConnectionHandlers {
  /** Consume one `session/update` notification (routed by the run's session id). */
  update?(params: SessionNotification): Promise<void> | void
  /** Answer one permission request under the active policy. */
  permission?(params: RequestPermissionRequest): Promise<RequestPermissionResponse>
}

/** One live `agent acp` subprocess plus its ACP wire, pooled by model. */
export interface PoolConnection {
  /** Parent-scoped unique connection id (diagnostics only). */
  readonly id: string
  /** The pool key (`''` for the Cursor-default model). */
  readonly model: string
  /** The subprocess seam handle; its streams carry the ACP wire. */
  readonly child: SubprocessHandle
  /** The ACP client connection over the child's stdio. */
  readonly conn: ClientSideConnection
  /** Settles (never rejects) once the process exits or its wire dies. */
  readonly died: Promise<void>
  /** True once the process exited or its wire died (eviction signal). */
  readonly dead: boolean
  /** The active run's handlers, or `undefined` while idle. */
  handlers: ConnectionHandlers | undefined
  /** Armed idle-reap timer while the connection sits in the idle list (absent when idle-unarmed). */
  idleTimer: ReturnType<typeof setTimeout> | undefined
}

/** Configuration for one {@link CursorPool}. Every field is already validated by the plugin. */
export interface CursorPoolConfig {
  /** The executable to spawn (`agent`/`cursor-agent`). */
  command: string
  /** Optional model key; pools are keyed by it via `--model <model> acp`. */
  model?: string
  /** Extra arguments placed before `acp` (e.g. `--trust` in headless setups). */
  args?: readonly string[]
  /** Permission auto-answer policy for every run on every pooled connection. */
  permission: PermissionPolicy
  /** Tool kinds allowed under `allowEdits`; every other kind is cancelled. */
  allowEditsKinds: readonly ToolKind[]
  /** Maximum concurrent connections (and therefore concurrent runs) per model. */
  poolSize: number
  /** Idle time before a released connection is closed and reaped. */
  idleTtlMs: number
  /** Bound on the per-connection ACP `initialize` handshake. */
  initTimeoutMs: number
  /** Working directory for the child PROCESS (pooled; the per-run session cwd
   * is passed to `session/new` and may differ per delegation). */
  processCwd: string
  /** Extra environment for the child (merged over the scrubbed parent env). */
  env: Record<string, string>
  /** EOF quiesce window on close, before the SIGTERM→SIGKILL escalation. */
  disposeEofGraceMs: number
  /** POSIX grace between SIGTERM and SIGKILL on close. */
  disposeGraceMs: number
  /** Spawn function from the subprocess seam (credential scrub + tree teardown). */
  spawn: (spec: SubprocessSpawnSpec) => SubprocessHandle
}

/** Answer one permission request under {@link policy}. Exported for direct unit tests. */
export function answerPermission(
  policy: PermissionPolicy,
  allowEditsKinds: readonly ToolKind[],
  params: RequestPermissionRequest,
): RequestPermissionResponse {
  const allow = (): RequestPermissionResponse => {
    const option = params.options.find(o => o.kind === 'allow_once' || o.kind === 'allow_always')
    return option === undefined
      ? { outcome: { outcome: 'cancelled' } }
      : { outcome: { outcome: 'selected', optionId: option.optionId } }
  }
  switch (policy) {
    case 'allow':
      return allow()
    case 'allowEdits': {
      const kind = params.toolCall.kind
      return kind != null && allowEditsKinds.includes(kind)
        ? allow()
        : { outcome: { outcome: 'cancelled' } }
    }
    case 'deny':
      return { outcome: { outcome: 'cancelled' } }
  }
}

/** Bounded whole-tree exit wait: polls the handle until it exits or `ms` elapses. */
async function treeExitsWithin(child: SubprocessHandle, ms: number): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, ms)
  try {
    return await child.waitForExit(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Cooperative close ladder for one pooled connection, over the seam's verbs:
 * stdin EOF (the child's window to flush and reap its own descendants), then
 * the terminate() escalation (SIGTERM → grace → SIGKILL) and its whole-tree
 * exit proof. Resolves only at whole-tree quiescence.
 */
export async function closeConnection(child: SubprocessHandle, eofGraceMs: number): Promise<void> {
  if (child.pid <= 0) {
    await child.done.catch(() => {})
    return
  }
  child.stdin?.end()
  if (await treeExitsWithin(child, eofGraceMs)) return
  child.terminate()
  await child.waitForExit()
}

/** Normalize an unknown thrown value to an Error (catch bindings are `unknown`). */
function toError(value: unknown): Error {
  /* v8 ignore next -- the typed APIs throw Errors; the String arm is defensive. */
  return value instanceof Error ? value : new Error(String(value))
}

/** The idle list, the in-use set, and in-flight spawn reservations for one model key. */
interface ModelSlots {
  idle: PoolConnection[]
  inUse: Set<PoolConnection>
  /** Connections being spawned right now (reserved capacity). */
  pending: number
}

/** A queued `acquire` waiting for a release (the pool is saturated). */
interface Waiter {
  readonly model: string
  readonly resolve: (connection: PoolConnection) => void
  readonly reject: (error: Error) => void
  readonly onAbort: () => void
}

/**
 * The pooled ACP connection registry. Owns spawn, reuse, liveness, idle
 * reaping, and teardown; each run borrows one connection and returns it
 * through {@link release}.
 */
export class CursorPool {
  private readonly slots = new Map<string, ModelSlots>()
  private readonly waiters: Waiter[] = []
  private disposed = false

  constructor(private readonly config: CursorPoolConfig) {}

  /** Per-model connection counts, for tests and diagnostics. */
  counts(): Record<string, { idle: number; inUse: number; pending: number }> {
    const out: Record<string, { idle: number; inUse: number; pending: number }> = {}
    for (const [model, slot] of this.slots) {
      out[model] = { idle: slot.idle.length, inUse: slot.inUse.size, pending: slot.pending }
    }
    return out
  }

  /** Answer one permission request under this pool's configured policy. */
  answer(params: RequestPermissionRequest): RequestPermissionResponse {
    return answerPermission(this.config.permission, this.config.allowEditsKinds, params)
  }

  private slot(model: string): ModelSlots {
    let slot = this.slots.get(model)
    if (slot === undefined) {
      slot = { idle: [], inUse: new Set(), pending: 0 }
      this.slots.set(model, slot)
    }
    return slot
  }

  private modelArgs(model: string): string[] {
    return model === '' ? [] : ['--model', model]
  }

  private async spawnConnection(model: string, signal: AbortSignal): Promise<PoolConnection> {
    const child = this.config.spawn({
      argv: [this.config.command, ...(this.config.args ?? []), ...this.modelArgs(model), 'acp'],
      cwd: this.config.processCwd,
      stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' },
      graceMs: this.config.disposeGraceMs,
      env: this.config.env,
    })
    /* v8 ignore start -- 'pipe' dispositions expose both streams by the seam contract; defensive. */
    if (child.stdin === undefined || child.stdout === undefined) {
      throw new Error('subagent-cursor: subprocess implementation dropped a piped protocol stream')
    }
    /* v8 ignore stop */
    let dead = false
    const markDead = (): void => { dead = true }
    child.done.then(markDead, markDead)
    child.stdout.on('close', markDead)

    // The client callbacks read the connection through this holder because the
    // connection literal below references the client (via `conn`), so neither
    // can be initialized before the other.
    const connectionRef: { connection?: PoolConnection } = {}
    const client: AcpClient = {
      sessionUpdate(params: SessionNotification): Promise<void> {
        const active = connectionRef.connection?.handlers
        return active?.update === undefined ? Promise.resolve() : Promise.resolve(active.update(params))
      },
      requestPermission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
        const active = connectionRef.connection?.handlers
        return active?.permission === undefined
          ? Promise.resolve({ outcome: { outcome: 'cancelled' } })
          : Promise.resolve(active.permission(params))
      },
    }

    const conn = new ClientSideConnection(
      () => client,
      ndJsonStream(
        NodeWritable.toWeb(child.stdin) as WritableStream<Uint8Array>,
        NodeReadable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
      ),
    )
    // The wire closing is the earliest authoritative "connection unusable"
    // signal (it fires even while the process is still draining), so a
    // connection that died while idle is never handed to a later acquire.
    conn.closed.then(markDead, markDead)

    // The connection's liveness mirror: `dead` stays a closure flag so
    // `release()` can decide eviction synchronously; `died` is its promise.
    const connection: PoolConnection = {
      id: randomUUID(),
      model: this.config.model ?? '',
      child,
      conn,
      died: child.done.then(
        () => { /* both outcomes settle the liveness promise */ },
        () => { /* both outcomes settle the liveness promise */ },
      ),
      get dead(): boolean { return dead },
      handlers: undefined,
      idleTimer: undefined,
    }
    connectionRef.connection = connection
    // The SDK's receive loop rejects `closed` when the wire dies (e.g. the
    // child crashed mid-prompt); observe it so the rejection is contained
    // rather than surfacing as an unhandled rejection. Eviction itself is
    // decided by the `dead` flag, not by this promise.
    conn.closed.catch(() => { /* contained; release-time eviction owns the outcome */ })

    // Spawn-level failure surfaces as `done` rejecting; a clean exit must never
    // win the handshake race, so its success arm parks forever.
    const spawnFailed: Promise<never> = child.done.then(
      /* v8 ignore next -- the success arm's never-settling executor is intentionally empty. */
      () => new Promise<never>(() => {}),
      (error: unknown) => Promise.reject(toError(error)),
    )
    spawnFailed.catch(() => { /* observed by the startup race; never unhandled */ })

    let initTimer: ReturnType<typeof setTimeout> | undefined
    const initTimeout = new Promise<never>((_, reject) => {
      initTimer = setTimeout(() => {
        reject(new Error(`subagent-cursor: ACP initialize handshake timed out after ${this.config.initTimeoutMs}ms`))
      }, this.config.initTimeoutMs)
      initTimer.unref()
    })
    const onAbort = (): void => { abortReject(new Error('subagent request was aborted before the Cursor ACP child started')) }
    let abortReject!: (error: Error) => void
    const aborted = new Promise<never>((_, reject) => {
      abortReject = reject
      signal.addEventListener('abort', onAbort, { once: true })
    })
    try {
      await Promise.race([
        conn.initialize({
          protocolVersion: PROTOCOL_VERSION,
          // Advertise NO optional client capabilities (no fs, no terminal): the
          // child self-serves in its own process.
          clientCapabilities: {},
        }),
        spawnFailed,
        initTimeout,
        aborted,
      ])
    } catch (error: unknown) {
      signal.removeEventListener('abort', onAbort)
      await closeConnection(child, this.config.disposeEofGraceMs)
      throw toError(error)
    } finally {
      clearTimeout(initTimer)
      signal.removeEventListener('abort', onAbort)
    }
    return connection
  }

  /**
   * Borrow one connection for a run, spawning or waiting as needed. Rejects on
   * `signal` abort, spawn/handshake failure, or pool disposal.
   */
  async acquire(model: string | undefined, signal: AbortSignal): Promise<PoolConnection> {
    if (this.disposed) throw new Error('subagent-cursor: provider pool is disposed')
    if (signal.aborted) throw new Error('subagent request was aborted before the Cursor ACP child started')
    const key = model ?? ''
    const slot = this.slot(key)
    const idle = slot.idle.shift()
    if (idle !== undefined) {
      clearIdleTimer(idle)
      slot.inUse.add(idle)
      return idle
    }
    // Reserve capacity synchronously so two concurrent acquires cannot both
    // spawn past the cap: the pending reservation holds the slot until the
    // spawned connection joins the in-use set (or the spawn fails).
    if (slot.inUse.size + slot.pending < this.config.poolSize) {
      slot.pending += 1
      let connection: PoolConnection
      try {
        connection = await this.spawnConnection(key, signal)
        this.slot(key).inUse.add(connection)
      } finally {
        slot.pending -= 1
      }
      return connection
    }
    // Saturated: queue until a release hands over a connection.
    return new Promise<PoolConnection>((resolve, reject) => {
      const onAbort = (): void => {
        const index = this.waiters.indexOf(waiter)
        if (index >= 0) this.waiters.splice(index, 1)
        reject(new Error('subagent request was aborted before the Cursor ACP child started'))
      }
      const waiter: Waiter = { model: key, resolve, reject, onAbort }
      this.waiters.push(waiter)
      signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  /**
   * Return a connection after its run settles. A dead connection is closed and
   * evicted; a live one either wakes the next waiter for its model or re-arms
   * its idle timer.
   * @param connection - the borrowed connection.
   * @param closeSessionId - the finished session to close best-effort on the
   * child side before the connection serves another run.
   * @param evict - force eviction: the releasing run suffered a transport
   * failure and the wire is suspect, so never re-idle this connection.
   */
  release(connection: PoolConnection, closeSessionId?: string, evict = false): void {
    const slot = this.slots.get(connection.model)
    slot?.inUse.delete(connection)
    connection.handlers = undefined
    if (closeSessionId !== undefined) {
      void connection.conn.closeSession({ sessionId: closeSessionId }).catch(() => {
        // The child may already be gone; session close is best-effort hygiene.
      })
    }
    if (this.disposed || connection.dead || evict) {
      void this.close(connection)
      return
    }
    const waiterIndex = this.waiters.findIndex(w => w.model === connection.model)
    if (waiterIndex >= 0) {
      const waiter = this.waiters[waiterIndex]
      this.waiters.splice(waiterIndex, 1)
      // The findIndex above already proved the waiter exists.
      if (waiter === undefined) {
        throw new Error('subagent-cursor: invariant violation — waiter index resolved to no waiter')
      }
      this.slot(connection.model).inUse.add(connection)
      waiter.resolve(connection)
      return
    }
    this.slot(connection.model).idle.push(connection)
    connection.idleTimer = setTimeout(() => {
      const current = this.slots.get(connection.model)
      if (current !== undefined) {
        const index = current.idle.indexOf(connection)
        if (index >= 0) {
          current.idle.splice(index, 1)
          void this.close(connection)
        }
      }
    }, this.config.idleTtlMs)
    connection.idleTimer.unref()
  }

  /** Close one connection and remove it from every bookkeeping structure. */
  async close(connection: PoolConnection): Promise<void> {
    clearIdleTimer(connection)
    const slot = this.slots.get(connection.model)
    if (slot !== undefined) {
      const idleIndex = slot.idle.indexOf(connection)
      if (idleIndex >= 0) slot.idle.splice(idleIndex, 1)
      slot.inUse.delete(connection)
    }
    await closeConnection(connection.child, this.config.disposeEofGraceMs)
  }

  /** Close every connection and reject pending waiters. Idempotent. */
  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    const all = [...this.slots.values()].flatMap(slot => [...slot.idle, ...slot.inUse])
    const waiters = this.waiters.splice(0)
    for (const waiter of waiters) {
      waiter.reject(new Error('subagent-cursor: provider pool is disposed'))
    }
    await Promise.allSettled(all.map(connection => this.close(connection)))
  }
}

/** Cancel a pooled connection's idle timer, if armed. */
function clearIdleTimer(connection: PoolConnection): void {
  if (connection.idleTimer !== undefined) {
    clearTimeout(connection.idleTimer)
    connection.idleTimer = undefined
  }
}
