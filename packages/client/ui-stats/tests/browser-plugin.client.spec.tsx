// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SlotTestRuntime, stubSettingsScope, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-stats/client'
import type { StatsDisplayRowInjected } from '../src/client/StatsDisplayRow.tsx'
import type { StatsLineInjected } from '../src/client/StatsLine.tsx'

usePinnedBrowserLanguages('zh-CN')

const ROOT = 's1' as SessionId

async function bench() {
  const runtime = await SlotTestRuntime.create()
  runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await runtime.sessions.add({ id: ROOT, summary: { title: 'R', displayTitle: 'R' } }, { current: false })
  const locale = new LocaleRuntime(runtime.ctx)
  runtime.provide('locale', locale)
  runtime.slots.installLocale(locale)

  await runtime.root.declare({
    'conversation.composer.dock': { kind: 'single', scope: 'session' },
    'settings.general.item': { kind: 'list', scope: 'root' },
  }, (_p: { renderSlot?: unknown }) => null)

  const feature = await runtime.mount({ inject: [...inject], apply })
  return { runtime, feature, slots: runtime.slots }
}

describe('ui-stats apply wiring', () => {
  it('registers the stats line and General Settings row', async () => {
    const b = await bench()
    expect(b.slots.entries('settings.general.item').map(entry => entry.options.id))
      .toEqual(['stats-display'])
    expect(b.slots.entries('conversation.composer.dock')).toHaveLength(1)
    await b.runtime.dispose()
  })

  it('plugin fiber disposal collects every registration', async () => {
    const b = await bench()
    await b.feature.dispose()
    expect(b.slots.entries('settings.general.item')).toHaveLength(0)
    expect(b.slots.entries('conversation.composer.dock')).toHaveLength(0)
    await b.runtime.dispose()
  })

  it('writes display flags through the stats General row and dock inject', async () => {
    const b = await bench()
    const stats = (b.slots.entries('settings.general.item')[0]!.inject as unknown as () => StatsDisplayRowInjected)()
    expect(stats.hooks.display.getSnapshot().showStatsCounts).toBe(true)
    stats.setDisplay('showStatsCounts', false)
    expect(stats.hooks.display.getSnapshot().showStatsCounts).toBe(false)

    const line = (b.slots.entries('conversation.composer.dock')[0]!.inject as unknown as () => StatsLineInjected)()
    expect(line.hooks.display.getSnapshot().showStatsCounts).toBe(false)
    await b.runtime.dispose()
  })
})
