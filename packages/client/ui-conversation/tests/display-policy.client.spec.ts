import { describe, expect, it } from 'vitest'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { ConversationDisplayPolicy } from '../src/client/settings/display-policy.ts'
import { DEFAULT_DISPLAY_FLAGS, type ConversationSettings } from '../src/submission-settings.ts'

const allOn = { busyEnter: 'queue' as const, ...DEFAULT_DISPLAY_FLAGS }

describe('ConversationDisplayPolicy', () => {
  it('defaults every flag on', () => {
    const policy = new ConversationDisplayPolicy()
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_DISPLAY_FLAGS)
  })

  it('writes an explicit change through the scope after publishing it locally', () => {
    const host = stubSettingsScope<ConversationSettings>()
    const observed: string[] = []
    let live = (): boolean => true
    const scope: typeof host.scope = {
      ...host.scope,
      set: (field, value) => {
        observed.push(`${field}=${String(value)}:${String(live())}`)
        return host.scope.set(field, value)
      },
    }
    const policy = new ConversationDisplayPolicy(scope)
    live = () => policy.prefs.getSnapshot().showStatsCounts
    policy.set('showStatsCounts', false)
    expect(observed).toEqual(['showStatsCounts=false:false'])
    expect(host.set).toHaveBeenCalledWith('showStatsCounts', false)
    expect(host.set).toHaveBeenCalledOnce()
  })

  it('adopts a Host preference without writing it back and leaves an identical write untouched', () => {
    const host = stubSettingsScope<ConversationSettings>()
    const policy = new ConversationDisplayPolicy(host.scope)
    host.publish({
      status: 'ready',
      value: { ...allOn, showGitBranch: false },
      revision: 1,
      writable: true,
    })
    expect(policy.prefs.getSnapshot().showGitBranch).toBe(false)
    policy.set('showGitBranch', false)
    expect(host.set).not.toHaveBeenCalled()
    host.publish({ value: { ...allOn, showGitBranch: false }, revision: 2 })
    expect(policy.prefs.getSnapshot().showGitBranch).toBe(false)
  })

  it('adopts a section already standing at construction', () => {
    const host = stubSettingsScope<ConversationSettings>()
    host.publish({
      status: 'ready',
      value: { ...allOn, showStatsTokens: false },
      revision: 1,
      writable: true,
    })
    const policy = new ConversationDisplayPolicy(host.scope)
    expect(policy.prefs.getSnapshot().showStatsTokens).toBe(false)
  })

  it('ignores an empty Host snapshot', () => {
    const host = stubSettingsScope<ConversationSettings>()
    const policy = new ConversationDisplayPolicy(host.scope)
    host.publish({ status: 'ready', revision: 1, writable: true })
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_DISPLAY_FLAGS)
  })
})
