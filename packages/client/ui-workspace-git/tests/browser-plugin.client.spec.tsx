// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { SlotTestRuntime, stubSettingsScope, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-workspace-git/client'
import type { GitDisplayRowInjected } from '../src/client/GitDisplayRow.tsx'
import type { WorkspaceGitChipInjected } from '../src/client/WorkspaceGitChip.tsx'

usePinnedBrowserLanguages('zh-CN')

const ROOT = 's1' as SessionId

async function bench(
  sample: (
    cwd: string,
    signal?: AbortSignal,
  ) => Promise<{
    ok: true
    value: { present: false } | {
      present: true
      shortHead: string
      dirty: number
      insertions: number
      deletions: number
    }
  } | { ok: false; error: { code: string; message: string; details: object } }> = async () => ({
    ok: true,
    value: { present: false },
  }),
) {
  const runtime = await SlotTestRuntime.create()
  runtime.provide('remote', {
    $on: () => () => {},
    workspaceGit: { sample },
  })
  runtime.provide('remote.workspaceGit', { sample })
  runtime.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await runtime.sessions.add({ id: ROOT, summary: { title: 'R', displayTitle: 'R' } }, { current: false })
  const locale = new LocaleRuntime(runtime.ctx)
  runtime.provide('locale', locale)
  runtime.slots.installLocale(locale)

  await runtime.root.declare({
    'conversation.session.header.utilities': { kind: 'list', scope: 'session' },
    'settings.general.item': { kind: 'list', scope: 'root' },
  }, (_p: { renderSlot?: unknown }) => null)

  const feature = await runtime.mount({ inject: [...inject], apply })
  return { runtime, feature, slots: runtime.slots }
}

describe('ui-workspace-git apply wiring', () => {
  it('registers the header chip and General Settings row', async () => {
    const b = await bench()
    expect(b.slots.entries('settings.general.item').map(entry => entry.options.id))
      .toEqual(['git-display'])
    expect(b.slots.entries('conversation.session.header.utilities').map(entry => entry.options.id))
      .toEqual(['workspace-git'])
    await b.runtime.dispose()
  })

  it('plugin fiber disposal collects every registration', async () => {
    const b = await bench()
    await b.feature.dispose()
    expect(b.slots.entries('settings.general.item')).toHaveLength(0)
    expect(b.slots.entries('conversation.session.header.utilities')).toHaveLength(0)
    await b.runtime.dispose()
  })

  it('samples git through the header inject and writes display flags', async () => {
    const sample = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        value: { present: true, shortHead: 'abc123', dirty: 0, insertions: 0, deletions: 0 },
      })
      .mockResolvedValueOnce({ ok: false, error: { code: 'carrier', message: 'offline', details: {} } })
      .mockResolvedValue({ ok: false, error: { code: 'carrier', message: 'offline', details: {} } })
    const b = await bench(sample)
    const git = (b.slots.entries('conversation.session.header.utilities')[0]!.inject as unknown as () => WorkspaceGitChipInjected)()
    expect(await git.sampleGit('/proj')).toEqual({
      present: true, shortHead: 'abc123', dirty: 0, insertions: 0, deletions: 0,
    })
    expect(await git.sampleGit('/proj')).toEqual({ present: false })
    expect(sample).toHaveBeenCalledWith('/proj')

    const abort = new AbortController()
    await git.sampleGit('/proj', abort.signal)
    expect(sample).toHaveBeenLastCalledWith('/proj', abort.signal)

    const gitRow = (b.slots.entries('settings.general.item')[0]!.inject as unknown as () => GitDisplayRowInjected)()
    expect(gitRow.hooks.display.getSnapshot().showGitBranch).toBe(true)
    gitRow.setDisplay('showGitBranch', false)
    expect(gitRow.hooks.display.getSnapshot().showGitBranch).toBe(false)
    await b.runtime.dispose()
  })
})
