import { describe, expect, it, afterEach } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SubagentRuntime from '@deepseek-ai/dsh-subagent'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import * as cursor from '../src/index.ts'

/**
 * Real-product coverage for the pooled Cursor backend: drives the ACTUAL
 * `agent acp` server (the Cursor CLI) with a real delegated prompt. Self-skips
 * when the agent binary is absent or not logged in; requires a reachable Cursor
 * backend (the px proxy env below covers the mainland deployment).
 */

const AGENT = process.env.CURSOR_AGENT_BIN ?? '/Users/yansir/.local/bin/agent'

function cursorReady(): boolean {
  if (!existsSync(AGENT)) return false
  const status = spawnSync(AGENT, ['status'], { encoding: 'utf8', timeout: 10_000 })
  return status.status === 0 && /Logged in/.test(status.stdout)
}

const READY = cursorReady()

// The Cursor agent talks to Cursor's own backend; on the mainland deployment
// that requires the px routed egress. Forward the ambient proxy vars when the
// test host set them, else default to the local px machine attachment.
const proxyEnv: Record<string, string> = {}
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY']) {
  if (process.env[name] !== undefined) proxyEnv[name] = process.env[name]!
}
if (proxyEnv.HTTPS_PROXY === undefined) {
  proxyEnv.HTTP_PROXY = 'http://127.0.0.1:2080'
  proxyEnv.HTTPS_PROXY = 'http://127.0.0.1:2080'
  proxyEnv.ALL_PROXY = 'socks5://127.0.0.1:2080'
}

const contexts: Context[] = []
afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

describe.skipIf(!READY)('real Cursor agent through the pooled backend', () => {
  it('delegates one task to the real agent and returns its final text', async () => {
    const ctx = new Context()
    contexts.push(ctx)
    await ctx.plugin(SubagentRuntime)
    await ctx.plugin(LocalSubprocessRuntime)
    await ctx.plugin(cursor, {
      providerName: 'cursor',
      command: AGENT,
      // --trust pre-approves the workspace so a fresh headless session never
      // blocks on a trust prompt; permission allow answers any remaining
      // permission requests unattended.
      args: ['--trust'],
      permission: 'allow',
      env: proxyEnv,
      poolSize: 1,
    })
    const run = await ctx.subagents.start('cursor', {
      label: 'real cursor e2e',
      prompt: [{ type: 'text' as const, text: 'Reply with exactly one line: CURSOR-OK' }],
      parent: { id: 'parent', session: { header: { cwd: process.cwd() } } } as never,
      signal: new AbortController().signal,
    })
    const result = await run.result
    await run.dispose()
    const output = result.output
      .filter(block => block.type === 'text')
      .map(block => (block as { text: string }).text)
      .join('')
    expect(result.stopReason).toBe('completed')
    expect(output).toContain('CURSOR-OK')
  }, 120_000)
})
