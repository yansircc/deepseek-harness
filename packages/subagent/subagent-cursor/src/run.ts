/**
 * Pooled ACP run driver for the Cursor subagent backend. One run borrows one
 * pooled connection, opens its own ACP session, submits one self-contained
 * text task, streams the child's assistant chunks into the shared result fold,
 * and releases the connection (closing the session best-effort) when the turn
 * settles. Cancellation races the remote turn against the local signal; the
 * pooled process is never torn down per run.
 *
 * @module @deepseek-ai/dsh-subagent-cursor/run
 */

import { randomUUID } from 'node:crypto'
import type {
  ContentBlock as AcpContentBlock,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  StopReason,
} from '@agentclientprotocol/sdk'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { AssistantOutputFold } from '@deepseek-ai/dsh-subagent'
import type { SubagentResult, SubagentRun, SubagentStartRequest, SubagentStopReason } from '@deepseek-ai/dsh-subagent'
import { type ConnectionHandlers, type CursorPool } from './pool.ts'

/** Resolved inputs for one pooled Cursor run (no defaults — see the plugin Config). */
export interface CursorRunSpec {
  /** The pooled ACP registry the run borrows its connection from. */
  pool: CursorPool
  /** The model key (`undefined` uses Cursor's own configured model). */
  model?: string
  /** Absolute working directory for the child process AND its ACP session. */
  cwd: string
  /**
   * Sink for a child-level failure that the run flattened into a stop reason
   * (the seam contract forbids `result` rejecting). A throw from the sink
   * itself is contained.
   */
  onError?: (error: Error, stopReason: SubagentStopReason) => void
}

/**
 * Map an ACP {@link StopReason} to a harness {@link SubagentStopReason}.
 * @param reason - the child's ACP terminal stop reason.
 * @returns the harness stop reason used by the shared result fold.
 */
export function cursorStopReason(reason: StopReason): SubagentStopReason {
  switch (reason) {
    case 'end_turn':
      return 'completed'
    case 'max_tokens':
      return 'max-tokens'
    case 'refusal':
      return 'refusal'
    case 'cancelled':
      return 'aborted'
    // `max_turn_requests` (the child hit its turn-request budget) has no direct
    // harness equivalent and means the task did NOT finish cleanly.
    case 'max_turn_requests':
      return 'error'
    // ACP StopReason is a closed wire union, but a future SDK could add a
    // variant; treat an unknown terminal reason as a failure.
    default:
      return 'error'
  }
}

/**
 * Collect the text of an ACP content block (non-text blocks contribute nothing).
 * @param content - one ACP content block from the child session.
 * @returns the text payload, or an empty string for non-text blocks.
 */
export function cursorContentText(content: AcpContentBlock): string {
  return content.type === 'text' ? content.text : ''
}

/**
 * Translate the harness prompt blocks into ACP prompt blocks (text only).
 * @param prompt - harness content blocks from the start request.
 * @returns ACP text blocks; non-text harness blocks are dropped.
 */
export function toAcpPrompt(prompt: ContentBlock[]): AcpContentBlock[] {
  const blocks: AcpContentBlock[] = []
  for (const block of prompt) {
    if (block.type === 'text') blocks.push({ type: 'text', text: block.text })
  }
  return blocks
}

/** Normalize an unknown thrown value to an Error (the catch binding is `unknown`). */
function toError(value: unknown): Error {
  /* v8 ignore next -- the SDK RPC rejections and spawn errors are always Errors; defensive. */
  return value instanceof Error ? value : new Error(String(value))
}

/**
 * Start and publish one pooled Cursor run. Startup owns connection acquisition
 * and session creation; after publication the run's result owns the turn and
 * the release. Cancellation settles the result without waiting for a
 * cooperative child; the pooled connection is released in every path.
 * @param request - the start request; its signal is the cancellation channel.
 * @param spec - the resolved run inputs.
 * @returns the ready run handle for the pooled Cursor session.
 */
export async function startCursorRun(request: SubagentStartRequest, spec: CursorRunSpec): Promise<SubagentRun> {
  if (request.signal.aborted) throw new Error('subagent request was aborted before the Cursor ACP child started')
  // ACP session ids are unique only within the child server. The lifecycle id
  // is minted in the parent namespace so pooled processes cannot collide with
  // each other or with a local agent that happens to use the same session id.
  const id = SessionId(randomUUID())

  // Acquisition may wait on a saturated pool; the signal owns that wait.
  const connection = await spec.pool.acquire(spec.model, request.signal)

  // The run's handlers: fold this session's assistant text, answer permission
  // prompts under the pool's policy. Session filtering keeps a reused
  // connection's late updates for a PREVIOUS session out of this run's fold.
  const fold = new AssistantOutputFold()
  const handlers: ConnectionHandlers = {
    update(params: SessionNotification): void {
      const update = params.update
      if (params.sessionId !== sessionId) return
      if (update.sessionUpdate === 'agent_message_chunk') {
        fold.pushText(cursorContentText(update.content))
      }
    },
    permission(params: RequestPermissionRequest): Promise<RequestPermissionResponse> {
      if (params.sessionId !== sessionId) return Promise.resolve({ outcome: { outcome: 'cancelled' } })
      return Promise.resolve(spec.pool.answer(params))
    },
  }
  const priorHandlers = connection.handlers
  connection.handlers = handlers

  let sessionId: string | undefined
  let released = false
  // A post-publication transport failure means the wire is suspect — the
  // connection must be evicted, not re-idled (a dead wire can outlive the
  // `dead` flag's process-exit signal, so the RUN owns this verdict).
  let unhealthy = false
  const release = (closeSessionId?: string): void => {
    if (released) return
    released = true
    connection.handlers = priorHandlers
    spec.pool.release(connection, closeSessionId, unhealthy)
  }

  // Cancellation settles the result without waiting for a cooperative child.
  // The flag is set by the abort listener and checked in every path, so a
  // cancellation racing the startup phase is never mistaken for a transport
  // failure.
  let signalCancelSettled!: () => void
  const cancelSettled = new Promise<void>((resolve) => { signalCancelSettled = resolve })
  const flags = { cancelled: false }
  const requestCancel = (): void => {
    if (flags.cancelled) return
    flags.cancelled = true
    signalCancelSettled()
    // Best-effort ACP cancel; the session close on release remains the hygiene
    // boundary. The pooled process itself is never killed per run.
    if (sessionId !== undefined) {
      void connection.conn.cancel({ sessionId }).catch(() => { /* child gone / no session */ })
    }
  }
  const onAbort = (): void => { requestCancel() }
  request.signal.addEventListener('abort', onAbort, { once: true })

  // Establish the remote session before publishing a handle. Any failure
  // releases the pooled connection and rejects; the process stays pooled.
  // The assignment lives in an inner closure (mirroring the fresh-process
  // backend) so the cross-closure invariant below stays a real check rather
  // than dead code the compiler can narrow away.
  try {
    await Promise.race([
      (async (): Promise<void> => {
        const session = await connection.conn.newSession({ cwd: spec.cwd, mcpServers: [] })
        const returnedSessionId: unknown = Reflect.get(session, 'sessionId')
        if (typeof returnedSessionId !== 'string') {
          throw new Error('Cursor ACP child published without a session id')
        }
        sessionId = returnedSessionId
        if (flags.cancelled) {
          throw new Error('subagent cancelled before the Cursor ACP session started')
        }
      })(),
      cancelSettled.then((): never => {
        throw new Error('subagent cancelled before the Cursor ACP session started')
      }),
    ])
  } catch (error: unknown) {
    request.signal.removeEventListener('abort', onAbort)
    release(sessionId)
    if (flags.cancelled) {
      throw new Error('subagent request was aborted before the Cursor ACP child started')
    }
    throw toError(error)
  }
  // The startup transaction validates the returned id before it can fulfill.
  // This assertion carries that cross-closure invariant into TypeScript.
  /* v8 ignore next */
  if (sessionId === undefined) throw new Error('unreachable: Cursor ACP startup fulfilled without a session id')
  const remoteSessionId = sessionId

  // Read at every return so a partial answer survives a later cancel/error.
  const collectOutput = (): ContentBlock[] => fold.collect() ?? []

  const result: Promise<SubagentResult> = (async (): Promise<SubagentResult> => {
    try {
      // Race the remote turn against local cancellation.
      const prompt = async (): Promise<SubagentResult> => {
        // The startup phase cannot fulfill without assigning the session id.
        const promptResult = await connection.conn.prompt({
          sessionId: remoteSessionId,
          prompt: toAcpPrompt(request.prompt),
        })
        return { output: collectOutput(), stopReason: cursorStopReason(promptResult.stopReason) }
      }
      return await Promise.race([
        prompt(),
        cancelSettled.then((): SubagentResult => ({ output: collectOutput(), stopReason: 'aborted' })),
      ])
    } catch (error: unknown) {
      // Cover a wire rejection already queued when cancellation arrives.
      /* v8 ignore next */
      if (flags.cancelled) return { output: collectOutput(), stopReason: 'aborted' }
      // A transport failure makes the pooled connection suspect — evict it so
      // the next delegation never borrows a dying wire.
      unhealthy = true
      // Flatten post-publication transport failures while preserving diagnostics.
      try {
        spec.onError?.(toError(error), 'error')
      } catch {
        // The diagnostic sink cannot reject the run result.
      }
      return { output: collectOutput(), stopReason: 'error' }
    } finally {
      request.signal.removeEventListener('abort', onAbort)
      // Release in every terminal path; the pooled process stays warm.
      release(remoteSessionId)
    }
  })()

  let disposal: Promise<void> | undefined
  return {
    id,
    localAgent: undefined,
    result,
    dispose(): Promise<void> {
      if (disposal !== undefined) return disposal
      request.signal.removeEventListener('abort', onAbort)
      requestCancel()
      // The result's finally releases the connection back to the pool.
      disposal = result.then(() => {})
      return disposal
    },
  }
}
