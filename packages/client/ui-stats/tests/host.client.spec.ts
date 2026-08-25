import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  DEFAULT_STATS_DISPLAY_FLAGS, STATS_SETTINGS_NAMESPACE, apply,
} from '@deepseek-ai/dsh-client-ui-stats'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

describe('ui-stats host', () => {
  it('registers, validates, and disposes the durable stats display flags', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(STATS_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual(DEFAULT_STATS_DISPLAY_FLAGS)
    await ctx.settings.update(ns, { showStatsCounts: false })
    expect(ctx.settings.get(ns)).toEqual({ ...DEFAULT_STATS_DISPLAY_FLAGS, showStatsCounts: false })
    await expect(ctx.settings.update(ns, { showStatsCounts: 'invalid' as unknown as boolean })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })
})
