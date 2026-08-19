/**
 * A minimal mock ACP AGENT, run as a subprocess, for the keyless
 * `dsh-subagent-cursor` tests. It speaks the agent side of ACP over stdio and
 * is fully scripted by environment variables — no model, no network. It is a
 * superset of the `dsh-subagent-acp` fixture: it supports SEQUENTIAL sessions
 * on one connection (the pooled backend reuses one process across runs) and
 * adds pool-specific probes:
 *
 * - `MOCK_TEXT`        — the assistant text it streams as one `agent_message_chunk`.
 * - `MOCK_ECHO_PID`    — if `1`, stream `process.pid` instead of MOCK_TEXT, so
 *                        a test can prove the SAME process served two runs
 *                        (pool reuse) or a NEW one was spawned (eviction).
 * - `MOCK_ECHO_ENV`    — if set to a variable NAME, stream that variable's value
 *                        (or `<NAME unset>`) instead of MOCK_TEXT.
 * - `MOCK_ECHO_CWD`    — if `1`, stream two lines: the agent PROCESS's
 *                        `process.cwd()` and the `cwd` announced in
 *                        `session/new` (asserts session-vs-process cwd split).
 * - `MOCK_STOP`        — the ACP `StopReason` it returns from `prompt`
 *                        (`end_turn` default, or `max_tokens`/`refusal`/…).
 * - `MOCK_HANG`        — if `1`, `prompt` never resolves on its own (it waits
 *                        for a `session/cancel`).
 * - `MOCK_IGNORE_CANCEL` — if `1` (with MOCK_HANG), the agent receives
 *                        `session/cancel` but NEVER resolves the pending prompt
 *                        and never exits — a non-cooperative child.
 * - `MOCK_PERMISSION`  — if `1`, the agent calls `session/request_permission`
 *                        before answering.
 * - `MOCK_PERMISSION_KIND` — the `toolCall.kind` on the permission request
 *                        (default `edit`) — drives the `allowEdits` policy.
 * - `MOCK_NO_ALLOW`    — if `1`, the permission options contain no allow kind.
 * - `MOCK_THOUGHT`     — if `1`, emit a non-message update first.
 * - `MOCK_CRASH_ON_PROMPT` — if `1`, exit hard on the prompt.
 * - `MOCK_CRASH_FILE`  — if set and the file EXISTS at process start, the
 *                        process arms a one-shot crash (deleting the marker
 *                        first) and exits hard on its first prompt. A test
 *                        writes the marker once: the FIRST spawned process
 *                        crashes and the NEXT one (marker gone) behaves
 *                        normally — proving eviction + respawn across runs.
 * - `MOCK_CRASH_ON_CANCEL` — if `1`, exit hard on `session/cancel`.
 * - `MOCK_READY_FILE`  — if set, touched once a prompt is in flight.
 * - `MOCK_MISSING_SESSION_ID` — if `1`, return a malformed `session/new`
 *                        response (startup rollback).
 * - `MOCK_FLUSH_ON_EOF` — if set, on stdin EOF take an async beat
 *                        (MOCK_FLUSH_DELAY_MS, default 150), touch this path,
 *                        and exit ON ITS OWN — proves idle-TTL reaping.
 * - `MOCK_SESSION_ID`  — fixed session id instead of a random one.
 *
 * It is not a test spec: the specs launch this protocol-only fixture through
 * the mode-aware example resolver. It imports no harness code or workspace
 * paths.
 *
 * @module @deepseek-ai/dsh-subagent-cursor/tests/mock-acp-server
 */

import { randomUUID } from 'node:crypto'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { Readable, Writable } from 'node:stream'
import {
  AgentSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  type Agent,
  type CancelNotification,
  type AuthenticateRequest,
  type InitializeRequest,
  type InitializeResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type StopReason,
} from '@agentclientprotocol/sdk'

const echoEnvName = process.env.MOCK_ECHO_ENV
const ECHO_PID = process.env.MOCK_ECHO_PID === '1'
const TEXT = echoEnvName !== undefined
  ? process.env[echoEnvName] ?? `<${echoEnvName} unset>`
  : ECHO_PID
    ? String(process.pid)
    : process.env.MOCK_TEXT ?? 'mock child answer'
const ECHO_CWD = process.env.MOCK_ECHO_CWD === '1'
const STOP = (process.env.MOCK_STOP ?? 'end_turn') as StopReason
const HANG = process.env.MOCK_HANG === '1'
const WANT_PERMISSION = process.env.MOCK_PERMISSION === '1'
const PERMISSION_KIND = process.env.MOCK_PERMISSION_KIND ?? 'edit'
const NO_ALLOW = process.env.MOCK_NO_ALLOW === '1'
const THOUGHT = process.env.MOCK_THOUGHT === '1'
const CRASH_ON_CANCEL = process.env.MOCK_CRASH_ON_CANCEL === '1'
const CRASH_ON_PROMPT = process.env.MOCK_CRASH_ON_PROMPT === '1'
// File-armed one-shot crash: if the marker exists at startup, delete it and
// crash on the first prompt. The next spawned process finds no marker.
const CRASH_FILE = process.env.MOCK_CRASH_FILE
let crashArmed = false
if (CRASH_FILE !== undefined && existsSync(CRASH_FILE)) {
  crashArmed = true
  rmSync(CRASH_FILE)
}
const IGNORE_CANCEL = process.env.MOCK_IGNORE_CANCEL === '1'
const READY_FILE = process.env.MOCK_READY_FILE
const FLUSH_ON_EOF = process.env.MOCK_FLUSH_ON_EOF

// Session counter, so the "malformed session/new once" probe can tell runs apart.
let newSessionCount = 0

function makeAgent(conn: AgentSideConnection): Agent {
  // Pending cancel resolver for the HANG path: a `session/cancel` resolves the
  // prompt with `cancelled`.
  let resolveCancel: ((reason: StopReason) => void) | undefined
  // The cwd the client announced in `session/new`, echoed under MOCK_ECHO_CWD.
  let sessionCwd: string | undefined

  return {
    initialize(_params: InitializeRequest): Promise<InitializeResponse> {
      return Promise.resolve({
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: { loadSession: false, promptCapabilities: { image: false, audio: false, embeddedContext: false } },
        authMethods: [],
      })
    },
    async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
      sessionCwd = params.cwd
      newSessionCount += 1
      if (process.env.MOCK_MISSING_SESSION_ID === '1') return {} as NewSessionResponse
      if (process.env.MOCK_MISSING_SESSION_ID_ONCE === '1' && newSessionCount === 1) return {} as NewSessionResponse
      return { sessionId: process.env.MOCK_SESSION_ID ?? randomUUID() }
    },
    authenticate(_params: AuthenticateRequest): Promise<void> {
      // No auth methods advertised; nothing to do.
      return Promise.resolve()
    },
    async prompt(params: PromptRequest): Promise<PromptResponse> {
      if (CRASH_ON_PROMPT || crashArmed) process.exit(1)
      if (WANT_PERMISSION) {
        const options = NO_ALLOW
          ? [{ optionId: 'no', name: 'Reject', kind: 'reject_once' as const }]
          : [
            { optionId: 'yes', name: 'Allow', kind: 'allow_once' as const },
            { optionId: 'no', name: 'Reject', kind: 'reject_once' as const },
          ]
        const decision = await conn.requestPermission({
          sessionId: params.sessionId,
          toolCall: { toolCallId: 'mock-call', title: 'mock side effect', kind: PERMISSION_KIND as never },
          options,
        })
        if (decision.outcome.outcome === 'cancelled') {
          return { stopReason: 'cancelled' }
        }
      }
      if (THOUGHT) {
        await conn.sessionUpdate({
          sessionId: params.sessionId,
          update: { sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'thinking…' } },
        })
      }
      await conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: ECHO_CWD ? `${process.cwd()}\n${sessionCwd ?? ''}` : TEXT },
        },
      })
      if (READY_FILE !== undefined) writeFileSync(READY_FILE, 'ready')
      if (HANG) {
        return new Promise<PromptResponse>((resolve) => {
          resolveCancel = (reason) => { resolve({ stopReason: reason }) }
        })
      }
      return { stopReason: STOP }
    },
    cancel(_params: CancelNotification): Promise<void> {
      if (CRASH_ON_CANCEL) {
        process.exit(1)
      }
      if (IGNORE_CANCEL) {
        return Promise.resolve()
      }
      resolveCancel?.('cancelled')
      return Promise.resolve()
    },
  }
}

new AgentSideConnection(
  makeAgent,
  ndJsonStream(
    Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
    Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
  ),
)

// Under MOCK_TRAP_SIGTERM, ignore SIGTERM and keep stdin open so the process
// neither quiesces on EOF nor dies on the graceful signal — exercising the
// close path's SIGKILL escalation.
if (process.env.MOCK_TRAP_SIGTERM === '1') {
  process.on('SIGTERM', () => { /* trapped: refuse to exit on the graceful signal */ })
  setInterval(() => { /* stay alive until SIGKILL */ }, 1000)
  if (READY_FILE !== undefined) writeFileSync(READY_FILE, 'trap-armed')
}

// Under MOCK_FLUSH_ON_EOF, model the real acp-agent's EOF-driven quiesce: on
// stdin 'end' (the close path's `child.stdin.end()`), take an ASYNC beat to
// "flush", then touch the marker and exit ON OUR OWN — proves an idle-TTL reap
// that gives EOF a real window lets the flush land.
if (FLUSH_ON_EOF !== undefined) {
  const flushDelayMs = Number(process.env.MOCK_FLUSH_DELAY_MS ?? '150')
  process.stdin.on('end', () => {
    setTimeout(() => {
      writeFileSync(FLUSH_ON_EOF, 'flushed')
      process.exit(0)
    }, flushDelayMs)
  })
}

// Under MOCK_IGNORE_EOF, keep the loop alive past stdin EOF but INSTALL A
// SIGTERM HANDLER that exits — exercising the close path's middle tier.
if (process.env.MOCK_IGNORE_EOF === '1') {
  const sigtermFile = process.env.MOCK_SIGTERM_FILE
  process.on('SIGTERM', () => {
    if (sigtermFile !== undefined) writeFileSync(sigtermFile, 'sigterm')
    process.exit(0)
  })
  setInterval(() => { /* stay alive past EOF until SIGTERM */ }, 1000)
  if (READY_FILE !== undefined) writeFileSync(READY_FILE, 'ignore-eof-armed')
}
