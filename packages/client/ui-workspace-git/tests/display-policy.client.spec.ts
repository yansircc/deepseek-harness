import { describe, expect, it } from 'vitest'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { WorkspaceGitDisplayPolicy } from '../src/client/display-policy.ts'
import { DEFAULT_GIT_DISPLAY_FLAGS, type WorkspaceGitSettings } from '../src/git-display-settings.ts'

describe('WorkspaceGitDisplayPolicy', () => {
  it('defaults every flag on', () => {
    const policy = new WorkspaceGitDisplayPolicy()
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_GIT_DISPLAY_FLAGS)
  })

  it('writes an explicit change through the scope after publishing it locally', () => {
    const host = stubSettingsScope<WorkspaceGitSettings>()
    const observed: string[] = []
    let live = (): boolean => true
    const scope: typeof host.scope = {
      ...host.scope,
      set: (field, value) => {
        observed.push(`${field}=${String(value)}:${String(live())}`)
        return host.scope.set(field, value)
      },
    }
    const policy = new WorkspaceGitDisplayPolicy(scope)
    live = () => policy.prefs.getSnapshot().showGitBranch
    policy.set('showGitBranch', false)
    expect(observed).toEqual(['showGitBranch=false:false'])
    expect(host.set).toHaveBeenCalledWith('showGitBranch', false)
    expect(host.set).toHaveBeenCalledOnce()
  })

  it('adopts a Host preference without writing it back and leaves an identical write untouched', () => {
    const host = stubSettingsScope<WorkspaceGitSettings>()
    const policy = new WorkspaceGitDisplayPolicy(host.scope)
    host.publish({
      status: 'ready',
      value: { ...DEFAULT_GIT_DISPLAY_FLAGS, showGitBranch: false },
      revision: 1,
      writable: true,
    })
    expect(policy.prefs.getSnapshot().showGitBranch).toBe(false)
    policy.set('showGitBranch', false)
    expect(host.set).not.toHaveBeenCalled()
    host.publish({ value: { ...DEFAULT_GIT_DISPLAY_FLAGS, showGitBranch: false }, revision: 2 })
    expect(policy.prefs.getSnapshot().showGitBranch).toBe(false)
  })

  it('adopts a section already standing at construction', () => {
    const host = stubSettingsScope<WorkspaceGitSettings>()
    host.publish({
      status: 'ready',
      value: { ...DEFAULT_GIT_DISPLAY_FLAGS, showGitDiffstat: false },
      revision: 1,
      writable: true,
    })
    const policy = new WorkspaceGitDisplayPolicy(host.scope)
    expect(policy.prefs.getSnapshot().showGitDiffstat).toBe(false)
  })

  it('ignores an empty Host snapshot', () => {
    const host = stubSettingsScope<WorkspaceGitSettings>()
    const policy = new WorkspaceGitDisplayPolicy(host.scope)
    host.publish({ status: 'ready', revision: 1, writable: true })
    expect(policy.prefs.getSnapshot()).toEqual(DEFAULT_GIT_DISPLAY_FLAGS)
  })
})
