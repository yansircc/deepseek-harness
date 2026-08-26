import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SettingsProvider } from '@deepseek-ai/dsh-settings'
import { registerChromeSettings, CHROME_SETTINGS_NAMESPACE } from '../src/settings.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected async load() { return {} as Record<string, unknown> }
  protected async persist() {}
}

describe('chrome-local settings namespace', () => {
  it('publishes the provider port for the Plugins card', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings)
    registerChromeSettings(ctx, { port: 17_319 })
    await new Promise(resolve => setTimeout(resolve, 0))
    const descriptor = ctx.settings.describe().find(item => item.ns === CHROME_SETTINGS_NAMESPACE)
    expect(descriptor).toMatchObject({ ns: 'chrome-local', value: { port: 17_319 }, applies: 'live' })
    await ctx.fiber.dispose()
  })
})
