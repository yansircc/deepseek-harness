import { describe, expect, it } from 'vitest'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { StatsDisplayPolicy } from '../src/client/display-policy.ts'
import { DEFAULT_STATS_DISPLAY_FLAGS, type StatsSettings } from '../src/stats-display-settings.ts'

describe('StatsDisplayPolicy', () => {
  it('defaults every flag on', () => {
    const policy = new StatsDisplayPolicy()
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_STATS_DISPLAY_FLAGS)
  })

  it('writes an explicit change through the scope after publishing it locally', () => {
    const host = stubSettingsScope<StatsSettings>()
    const observed: string[] = []
    let live = (): boolean => true
    const scope: typeof host.scope = {
      ...host.scope,
      set: (field, value) => {
        observed.push(`${field}=${String(value)}:${String(live())}`)
        return host.scope.set(field, value)
      },
    }
    const policy = new StatsDisplayPolicy(scope)
    live = () => policy.prefs.getSnapshot().showStatsCounts
    policy.set('showStatsCounts', false)
    expect(observed).toEqual(['showStatsCounts=false:false'])
    expect(host.set).toHaveBeenCalledWith('showStatsCounts', false)
    expect(host.set).toHaveBeenCalledOnce()
  })

  it('adopts a Host preference without writing it back and leaves an identical write untouched', () => {
    const host = stubSettingsScope<StatsSettings>()
    const policy = new StatsDisplayPolicy(host.scope)
    host.publish({
      status: 'ready',
      value: { ...DEFAULT_STATS_DISPLAY_FLAGS, showStatsCounts: false },
      revision: 1,
      writable: true,
    })
    expect(policy.prefs.getSnapshot().showStatsCounts).toBe(false)
    policy.set('showStatsCounts', false)
    expect(host.set).not.toHaveBeenCalled()
    host.publish({ value: { ...DEFAULT_STATS_DISPLAY_FLAGS, showStatsCounts: false }, revision: 2 })
    expect(policy.prefs.getSnapshot().showStatsCounts).toBe(false)
  })

  it('adopts a section already standing at construction', () => {
    const host = stubSettingsScope<StatsSettings>()
    host.publish({
      status: 'ready',
      value: { ...DEFAULT_STATS_DISPLAY_FLAGS, showStatsTokens: false },
      revision: 1,
      writable: true,
    })
    const policy = new StatsDisplayPolicy(host.scope)
    expect(policy.prefs.getSnapshot().showStatsTokens).toBe(false)
  })

  it('ignores an empty Host snapshot', () => {
    const host = stubSettingsScope<StatsSettings>()
    const policy = new StatsDisplayPolicy(host.scope)
    host.publish({ status: 'ready', revision: 1, writable: true })
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_STATS_DISPLAY_FLAGS)
  })
})
