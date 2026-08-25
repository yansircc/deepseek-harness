import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ChromeBuildId, ChromeOperationRevision, ChromeProviderId } from '@deepseek-ai/dsh-chrome-protocol'
import { ChromeError, ChromeRuntime, type ChromeProvider } from '../src/index.ts'

const owner = {} as Agent
const command = { domain: 'tab', call: { op: 'list' } } as const
const health = {
  kernel: 'listening' as const, connector: 'polling' as const, runtime: 'idle' as const,
  kernelProtocolVersion: '1', kernelBuildId: ChromeBuildId('build'), operationRevision: ChromeOperationRevision('ops'),
}
const provider = (overrides: Partial<ChromeProvider> = {}): ChromeProvider => ({
  id: ChromeProviderId('local'),
  start: async () => {}, execute: async () => [], status: async () => health, close: async () => {}, ...overrides,
})

const context = async (): Promise<Context> => {
  const ctx = new Context()
  await ctx.plugin(ChromeRuntime)
  return ctx
}

describe('ChromeRuntime', () => {
  it('publishes only after provider startup succeeds and forwards owner/signal', async () => {
    const ctx = await context(); const runtime = ctx.get('chrome')!
    const signal = new AbortController().signal
    let received: unknown
    await runtime.registerProvider(provider({ execute: async (value) => { received = value; return [] } }))
    await runtime.execute(owner, command, signal)
    expect(received).toMatchObject({ owner, signal })
    expect(runtime.hasOwnerActivity(owner)).toBe(false)
    await ctx.fiber.dispose()
  })
  it('rejects missing and duplicate providers', async () => {
    const ctx = await context(); const runtime = ctx.get('chrome')!
    await expect(runtime.execute(owner, command, new AbortController().signal)).rejects.toMatchObject({ code: 'CHROME_PROVIDER_MISSING' })
    await runtime.registerProvider(provider())
    await expect(runtime.registerProvider(provider())).rejects.toMatchObject({ code: 'CHROME_PROVIDER_DUPLICATE' })
    await ctx.fiber.dispose()
  })
  it('rolls back a failed start and exposes a machine-routable failure', async () => {
    const ctx = await context(); const runtime = ctx.get('chrome')!; let closed = false
    await expect(runtime.registerProvider(provider({ start: async () => { throw new Error('bind') }, close: async () => { closed = true } }))).rejects.toMatchObject({ code: 'CHROME_PROVIDER_START_FAILED' })
    expect(closed).toBe(true); await ctx.fiber.dispose()
  })
  it('awaits provider close on disposal', async () => {
    let release!: () => void; const closed = new Promise<void>((resolve) => { release = resolve })
    const ctx = await context(); const runtime = ctx.get('chrome')!; let done = false
    await runtime.registerProvider(provider({ close: async () => { await closed; done = true } }))
    const disposal = ctx.fiber.dispose()
    await Promise.resolve()
    expect(done).toBe(false)
    release()
    await disposal
    expect(done).toBe(true)
  })
  it('rejects caller-aborted execution before provider invocation', async () => {
    const ctx = await context(); const runtime = ctx.get('chrome')!; let called = false
    await runtime.registerProvider(provider({ execute: async () => { called = true; return null } }))
    const controller = new AbortController(); controller.abort('cancel')
    await expect(runtime.execute(owner, command, controller.signal)).rejects.toThrow()
    expect(called).toBe(false); await ctx.fiber.dispose()
  })
  it('retains ChromeError identity', () => { expect(new ChromeError('x', 'CHROME_PROVIDER_MISSING')).toBeInstanceOf(ChromeError) })
})
