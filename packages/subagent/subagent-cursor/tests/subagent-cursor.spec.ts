import { describe, expect, it, afterEach } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cursor from '../src/index.ts'
import { answerPermission } from '../src/pool.ts'
import { cursorContentText, cursorStopReason, startCursorRun, toAcpPrompt } from '../src/run.ts'

/**
 * Keyless integration tests for the pooled Cursor subagent backend. Each
 * spawns a REAL subprocess — the scripted mock ACP server
 * (tests/mock-acp-server.ts) — and drives it through the REAL backend over
 * real ACP JSON-RPC stdio. Pool reuse, eviction, saturation, idle reaping,
 * permission policy, cancellation, and quiescent close are all exercised end
 * to end. No model, no key.
 */

const mockServer = fileURLToPath(new URL('./mock-acp-server.ts', import.meta.url))

/** A parent Agent stub. The Cursor backend reads one thing off it: the session header's cwd. */
function fakeParent(cwd = process.cwd()): Agent {
  return { id: 'parent', session: { header: { cwd } }, options: {} } as unknown as Agent
}

function request(text = 'p', parent?: Agent, signal = new AbortController().signal) {
  return { prompt: [{ type: 'text' as const, text }], parent: parent ?? fakeParent(), signal }
}

interface SetupEnv {
  /** Mock-server scripting env: MOCK_TEXT / MOCK_STOP / MOCK_HANG / MOCK_PERMISSION / …. */
  [key: string]: string
}

const contexts: Context[] = []

/**
 * Mount the Cursor backend pointed at the mock server, scripted by `mockEnv`.
 * `overrides` selects the backend's pool/permission configuration.
 */
async function setup(mockEnv: SetupEnv = {}, overrides: Partial<Parameters<typeof cursor.apply>[1]> = {}) {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(SubagentRuntime)
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(cursor, {
    providerName: 'cursor',
    command: process.execPath,
    args: [mockServer],
    env: mockEnv,
    ...overrides,
  })
  return ctx
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function text(blocks: { type: string; text?: string }[]): string {
  return blocks.filter(b => b.type === 'text').map(b => b.text).join('')
}

/** Run one delegation to completion and dispose it, returning the result text. */
async function runOnce(ctx: Context, parent?: Agent): Promise<{ stopReason: string; output: string }> {
  const run = await ctx.subagents.start('cursor', {
    label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: parent ?? fakeParent(), signal: new AbortController().signal,
  })
  const result = await run.result
  await run.dispose()
  return { stopReason: result.stopReason, output: text(result.output) }
}

describe('Profile Bundle manifest', () => {
  it('declares a dormant Host provider patch and does not start a Cursor process', () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
      files?: string[]
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.files).toContain('cordis.patch.yml')
    const patch = readFileSync(join(packageDir, manifest.dsh!.bundle!.patch!), 'utf8')
    expect(patch).toContain('id: subagent-cursor')
    expect(patch).toContain("name: '@deepseek-ai/dsh-subagent-cursor'")
  })
})

describe('cursorStopReason', () => {
  it('maps each ACP stop reason to the harness vocabulary', () => {
    expect(cursorStopReason('end_turn')).toBe('completed')
    expect(cursorStopReason('max_tokens')).toBe('max-tokens')
    expect(cursorStopReason('refusal')).toBe('refusal')
    expect(cursorStopReason('cancelled')).toBe('aborted')
    expect(cursorStopReason('max_turn_requests')).toBe('error')
  })

  it('treats an unknown terminal reason as an error', () => {
    expect(cursorStopReason('something-new' as never)).toBe('error')
  })
})

describe('cursorContentText / toAcpPrompt', () => {
  it('extracts text from a text content block, empty for non-text', () => {
    expect(cursorContentText({ type: 'text', text: 'hi' })).toBe('hi')
    expect(cursorContentText({ type: 'image', data: 'x', mimeType: 'image/png' })).toBe('')
  })

  it('keeps text prompt blocks and drops non-text ones', () => {
    expect(toAcpPrompt([{ type: 'text', text: 'a' }])).toEqual([{ type: 'text', text: 'a' }])
    expect(toAcpPrompt([{ type: 'text', text: 'a' }, { type: 'reasoning', text: 'think' }]))
      .toEqual([{ type: 'text', text: 'a' }])
  })
})

describe('answerPermission (pure policy)', () => {
  const request = (kind?: string): Parameters<typeof answerPermission>[2] => ({
    sessionId: 's',
    toolCall: { toolCallId: 't', title: 'tool', ...(kind === undefined ? {} : { kind }) },
    options: [
      { optionId: 'yes', name: 'Allow', kind: 'allow_once' as const },
      { optionId: 'no', name: 'Reject', kind: 'reject_once' as const },
    ],
  }) as Parameters<typeof answerPermission>[2]

  it('deny cancels every request', () => {
    expect(answerPermission('deny', ['edit'], request('edit'))).toEqual({ outcome: { outcome: 'cancelled' } })
  })

  it('allow selects the first allow option', () => {
    expect(answerPermission('allow', [], request('execute'))).toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } })
  })

  it('allow cancels when the child offers no allow option', () => {
    expect(answerPermission('allow', [], {
      sessionId: 's',
      toolCall: { toolCallId: 't', title: 'tool' },
      options: [{ optionId: 'no', name: 'Reject', kind: 'reject_once' as const }],
    })).toEqual({ outcome: { outcome: 'cancelled' } })
  })

  it('allowEdits approves only the configured kinds', () => {
    expect(answerPermission('allowEdits', ['edit', 'delete'], request('edit')))
      .toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } })
    expect(answerPermission('allowEdits', ['edit', 'delete'], request('delete')))
      .toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } })
    expect(answerPermission('allowEdits', ['edit', 'delete'], request('execute')))
      .toEqual({ outcome: { outcome: 'cancelled' } })
    expect(answerPermission('allowEdits', ['edit', 'delete'], request(undefined)))
      .toEqual({ outcome: { outcome: 'cancelled' } })
  })
})

describe('depthLimit capability', () => {
  it('rejects a delegation that would exceed the requested cap', async () => {
    const ctx = await setup({ MOCK_TEXT: 'never' })
    await expect(ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: new AbortController().signal, maxDepth: 0,
    })).rejects.toThrow(/subagent depth 1 exceeds maxDepth 0/)
  })

  it('accepts a delegation within the cap', async () => {
    const ctx = await setup({ MOCK_TEXT: 'within' })
    const run = await ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: new AbortController().signal, maxDepth: 1,
    })
    const result = await run.result
    await run.dispose()
    expect(result.stopReason).toBe('completed')
    expect(text(result.output)).toBe('within')
  })
})

describe('basic run on the pooled backend', () => {
  it('completes with the child answer text', async () => {
    const ctx = await setup({ MOCK_TEXT: 'the answer' })
    const { stopReason, output } = await runOnce(ctx)
    expect(stopReason).toBe('completed')
    expect(output).toBe('the answer')
  })

  it('maps non-completed stop reasons', async () => {
    const maxTokens = await setup({ MOCK_STOP: 'max_tokens' })
    expect((await runOnce(maxTokens)).stopReason).toBe('max-tokens')
    const refusal = await setup({ MOCK_STOP: 'refusal' })
    expect((await runOnce(refusal)).stopReason).toBe('refusal')
  })

  it('flattens a crashed child into an error stop reason', async () => {
    const ctx = await setup({ MOCK_CRASH_ON_PROMPT: '1' })
    const { stopReason, output } = await runOnce(ctx)
    expect(stopReason).toBe('error')
    expect(output).toBe('')
  })

  it('rejects before publication on a spawn failure', async () => {
    const ctx = await setup({}, { command: '/nonexistent/cursor-agent' })
    await expect(ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: new AbortController().signal,
    })).rejects.toThrow()
  })

  it('rejects before publication on a malformed session/new and recovers', async () => {
    // The FIRST session/new on the pooled process is malformed (startup
    // rollback); the connection must be released so the SECOND run succeeds on
    // the SAME pooled process (echo-pid proves reuse, not a respawn).
    const ctx = await setup({ MOCK_MISSING_SESSION_ID_ONCE: '1', MOCK_ECHO_PID: '1' })
    await expect(ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: new AbortController().signal,
    })).rejects.toThrow(/without a session id/)
    const second = await runOnce(ctx)
    expect(second.stopReason).toBe('completed')
    expect(second.output).not.toBe('')
  })
})

describe('Cursor editor extensions through the wire', () => {
  it('acknowledges cursor/update_todos and a cursor/ notification, then answers', async () => {
    const resultFile = join(mkdtempSync(join(tmpdir(), 'cursor-ext-')), 'result.json')
    const ctx = await setup({
      MOCK_EXT_METHOD: 'cursor/update_todos',
      MOCK_EXT_NOTIFICATION: 'cursor/update_todos',
      MOCK_EXT_RESULT_FILE: resultFile,
      MOCK_TEXT: 'after todos',
    })
    const { stopReason, output } = await runOnce(ctx)
    expect(stopReason).toBe('completed')
    expect(output).toBe('after todos')
    expect(JSON.parse(readFileSync(resultFile, 'utf8'))).toEqual({})
  })

  it('still rejects a non-Cursor unmatched client method', async () => {
    const ctx = await setup({ MOCK_EXT_METHOD: 'other/foo', MOCK_TEXT: 'never seen' })
    const { stopReason } = await runOnce(ctx)
    expect(stopReason).toBe('error')
  })
})

describe('permission policy through the wire', () => {
  it('deny (default) cancels a permission-requesting child', async () => {
    const ctx = await setup({ MOCK_PERMISSION: '1', MOCK_TEXT: 'never seen' })
    const { stopReason, output } = await runOnce(ctx)
    expect(stopReason).toBe('aborted')
    expect(output).toBe('')
  })

  it('allow approves the child and lets it answer', async () => {
    const ctx = await setup({ MOCK_PERMISSION: '1', MOCK_TEXT: 'approved answer' }, { permission: 'allow' })
    const { stopReason, output } = await runOnce(ctx)
    expect(stopReason).toBe('completed')
    expect(output).toBe('approved answer')
  })

  it('allowEdits approves an edit kind and cancels an execute kind', async () => {
    const allowed = await setup({ MOCK_PERMISSION: '1', MOCK_PERMISSION_KIND: 'edit', MOCK_TEXT: 'edited' }, { permission: 'allowEdits' })
    expect((await runOnce(allowed)).output).toBe('edited')
    const denied = await setup({ MOCK_PERMISSION: '1', MOCK_PERMISSION_KIND: 'execute' }, { permission: 'allowEdits' })
    const { stopReason, output } = await runOnce(denied)
    expect(stopReason).toBe('aborted')
    expect(output).toBe('')
  })
})

describe('pool reuse and lifecycle', () => {
  it('reuses one warm process across sequential runs', async () => {
    const ctx = await setup({ MOCK_ECHO_PID: '1' })
    const first = await runOnce(ctx)
    const second = await runOnce(ctx)
    expect(first.stopReason).toBe('completed')
    expect(second.stopReason).toBe('completed')
    // Both runs served by the SAME child process: same pid.
    expect(second.output).toBe(first.output)
    expect(first.output).toMatch(/^\d+$/)
  })

  it('serializes concurrent runs through a saturated pool', async () => {
    // poolSize 1: the second run must WAIT for the first to release, then
    // reuse the same connection — both answers come from the same pid.
    const ctx = await setup({ MOCK_ECHO_PID: '1' }, { poolSize: 1 })
    const parent = fakeParent()
    const start = (): ReturnType<typeof ctx.subagents.start> => ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent, signal: new AbortController().signal,
    })
    const [runA, runB] = [start(), start()]
    const settle = async (runPromise: ReturnType<typeof start>): Promise<{ stopReason: string; output: string }> => {
      const run = await runPromise
      const result = await run.result
      await run.dispose()
      return { stopReason: result.stopReason, output: text(result.output) }
    }
    const results = await Promise.all([settle(runA), settle(runB)])
    expect(results.map(r => r.stopReason)).toEqual(['completed', 'completed'])
    expect(results[0].output).toBe(results[1].output)
  })

  it('evicts a crashed connection and respawns for the next run', async () => {
    // Arm a one-shot crash marker: the FIRST spawned process crashes on its
    // first prompt (and deletes the marker). If the pool kept the dead
    // connection, the second run's session/new would fail — completing proves
    // eviction, and the second process (marker gone) answers with its pid.
    const marker = join(mkdtempSync(join(tmpdir(), 'cursor-crash-')), 'armed')
    writeFileSync(marker, 'armed')
    const ctx = await setup({ MOCK_CRASH_FILE: marker, MOCK_ECHO_PID: '1' })
    const first = await runOnce(ctx)
    expect(first.stopReason).toBe('error')
    expect(first.output).toBe('')
    const second = await runOnce(ctx)
    expect(second.stopReason).toBe('completed')
    expect(second.output).toMatch(/^\d+$/)
  })

  it('reaps an idle connection after the TTL', async () => {
    const marker = join(mkdtempSync(join(tmpdir(), 'cursor-pool-ttl-')), 'reaped')
    const ctx = await setup({ MOCK_FLUSH_ON_EOF: marker }, { idleTtlMs: 200 })
    await runOnce(ctx)
    // After release, the idle timer (200ms) + flush beat (150ms) must reap the
    // process and touch the marker.
    const deadline = Date.now() + 5000
    while (!existsSync(marker)) {
      if (Date.now() > deadline) throw new Error('idle connection was never reaped')
      await new Promise(r => setTimeout(r, 20))
    }
  })

  it('keeps a warm connection alive across runs without reaping', async () => {
    // Two back-to-back runs with a LONG idle TTL: the process must NOT be
    // reaped between them (same pid on both).
    const ctx = await setup({ MOCK_ECHO_PID: '1' }, { idleTtlMs: 60_000 })
    const first = await runOnce(ctx)
    await new Promise(r => setTimeout(r, 300))
    const second = await runOnce(ctx)
    expect(second.output).toBe(first.output)
  })
})

describe('cancellation and disposal', () => {
  it('settles aborted when the signal fires during a hanging prompt', async () => {
    const ctx = await setup({ MOCK_HANG: '1' })
    const controller = new AbortController()
    const run = await ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: controller.signal,
    })
    controller.abort()
    const result = await run.result
    expect(result.stopReason).toBe('aborted')
    await run.dispose()
  })

  it('dispose cancels and reaches quiescence against a non-cooperative child', async () => {
    const ctx = await setup({ MOCK_HANG: '1', MOCK_IGNORE_CANCEL: '1' })
    const run = await ctx.subagents.start('cursor', {
      label: 'p', prompt: [{ type: 'text' as const, text: 'p' }], parent: fakeParent(), signal: new AbortController().signal,
    })
    // dispose() cancels the turn; the result must settle 'aborted' even though
    // the child ignores the cancel and never resolves its prompt.
    await run.dispose()
    const result = await run.result
    expect(result.stopReason).toBe('aborted')
  })
})

describe('workspace and env handling', () => {
  it('announces the parent session cwd as the session workspace, process cwd differs', async () => {
    // No config cwd: the pooled PROCESS runs in the harness launch directory
    // (process.cwd()), while the session workspace is the parent session's
    // cwd. MOCK_ECHO_CWD streams "<process cwd>\n<session cwd>".
    const sessionCwd = mkdtempSync(join(tmpdir(), 'cursor-session-'))
    const ctx = await setup({ MOCK_ECHO_CWD: '1' })
    const { output } = await runOnce(ctx, fakeParent(sessionCwd))
    const [processCwd, announced] = output.split('\n')
    expect(processCwd).toBe(process.cwd())
    expect(announced).toBe(sessionCwd)
  })

  it('forwards explicit env entries to the child process', async () => {
    const ctx = await setup({ MOCK_ECHO_ENV: 'CURSOR_TEST_FACT', CURSOR_TEST_FACT: 'forwarded' })
    const { output } = await runOnce(ctx)
    expect(output).toBe('forwarded')
  })
})

describe('startCursorRun direct contract', () => {
  it('rejects a run whose signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await setup()
    await expect(startCursorRun(request('p', fakeParent(), controller.signal), {
      pool: undefined as never,
      cwd: process.cwd(),
    })).rejects.toThrow(/aborted before the Cursor ACP child started/)
  })
})
