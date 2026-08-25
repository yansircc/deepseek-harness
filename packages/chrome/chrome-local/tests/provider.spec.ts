import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { ChromeRuntime } from '@deepseek-ai/dsh-chrome'
import { LocalChromeProvider } from '../src/provider.ts'
import { resolveConfig } from '../src/config.ts'

const artifact = {
  extensionId: 'extension', displayVersion: '0.5.3', protocolFingerprint: 'ff'.repeat(32),
  kernelBuildId: 'test-build', operationRevision: 'test-ops',
}

describe('local Chrome provider lifecycle', () => {
  it('publishes only after a successful bind and reaches quiescent close', async () => {
    const ctx = new Context()
    await ctx.plugin(ChromeRuntime)
    const provider = new LocalChromeProvider(resolveConfig({ port: 17681 }), artifact)
    const dispose = await ctx.chrome.registerProvider(provider)
    expect((await ctx.chrome.status()).kernel).toBe('listening')
    await dispose()
    await expect(ctx.chrome.status()).rejects.toMatchObject({ code: 'CHROME_PROVIDER_MISSING' })
    await provider.close('again')
    await ctx.fiber.dispose()
  })

  it('fails startup loudly without publishing when the port is occupied', async () => {
    const first = new LocalChromeProvider(resolveConfig({ port: 17682 }), artifact)
    await first.start(new AbortController().signal)
    const ctx = new Context()
    await ctx.plugin(ChromeRuntime)
    const second = new LocalChromeProvider(resolveConfig({ port: 17682 }), artifact)
    await expect(ctx.chrome.registerProvider(second)).rejects.toMatchObject({ code: 'CHROME_PROVIDER_START_FAILED' })
    await expect(ctx.chrome.status()).rejects.toMatchObject({ code: 'CHROME_PROVIDER_MISSING' })
    await first.close('test complete')
    await ctx.fiber.dispose()
  })
})
