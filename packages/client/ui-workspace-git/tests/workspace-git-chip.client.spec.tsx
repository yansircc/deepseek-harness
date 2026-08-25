// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import {
  createSnapshotStore, type SessionId, type SessionListState, type SessionSummary,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { WorkspaceGitSample } from '../src/client/sample-status.ts'
import { gitChips, GIT_STATUS_POLL_MS, WorkspaceGitChip } from '../src/client/WorkspaceGitChip.tsx'
import type { WorkspaceGitChipProps } from '../src/client/WorkspaceGitChip.tsx'
import { DEFAULT_GIT_DISPLAY_FLAGS, type WorkspaceGitDisplayPreferences } from '../src/git-display-settings.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const SID = 's1' as SessionId
const t = makeTranslate(en)

const present: Extract<WorkspaceGitSample, { present: true }> = {
  present: true,
  shortHead: '4a2c1f',
  dirty: 3,
  insertions: 120,
  deletions: 30,
  branch: 'feat/stats',
  ahead: 2,
  behind: 1,
}

function summary(cwd?: string): SessionSummary {
  return cwd === undefined
    ? { id: SID, displayTitle: 't', running: false, blank: false, updatedAt: 0 }
    : { id: SID, displayTitle: 't', cwd, running: false, blank: false, updatedAt: 0 }
}

function sessions(cwd?: string) {
  const byId: Record<SessionId, SessionSummary> = { [SID]: summary(cwd) }
  return bindSnapshotSelector(createSnapshotStore<SessionListState>({
    ids: [SID],
    byId,
    current: SID, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
  }))
}

function chipProps(
  sampleGit: (path: string, signal?: AbortSignal) => Promise<WorkspaceGitSample>,
  options: {
    display?: WorkspaceGitDisplayPreferences
    cwd?: string | undefined
    /** When true, omit cwd on the session summary entirely. */
    omitCwd?: boolean
  } = {},
): WorkspaceGitChipProps {
  const display = options.display ?? DEFAULT_GIT_DISPLAY_FLAGS
  const useSessions = options.omitCwd
    ? sessions(undefined)
    : sessions(options.cwd ?? '/tmp/ws')
  return {
    sessionId: SID,
    useSessions,
    useDisplay: bindSnapshotSelector(createSnapshotStore(display)),
    sampleGit,
    t,
  } as unknown as WorkspaceGitChipProps
}

function mount(
  sampleGit: (path: string, signal?: AbortSignal) => Promise<WorkspaceGitSample>,
  display: WorkspaceGitDisplayPreferences = DEFAULT_GIT_DISPLAY_FLAGS,
  cwd: string | undefined = '/tmp/ws',
) {
  return render(<WorkspaceGitChip {...chipProps(sampleGit, { display, cwd })} />)
}

describe('gitChips', () => {
  it('joins the four facts and hides zero sides', () => {
    expect(gitChips(present, DEFAULT_GIT_DISPLAY_FLAGS, t))
      .toEqual(['feat/stats', '3', '↑2 ↓1', '+120 −30'])
    expect(gitChips({ present: false }, DEFAULT_GIT_DISPLAY_FLAGS, t)).toEqual([])
    expect(gitChips({
      present: true, shortHead: '4a2c1f', dirty: 0, insertions: 0, deletions: 0,
    }, DEFAULT_GIT_DISPLAY_FLAGS, t)).toEqual(['HEAD 4a2c1f'])
    expect(gitChips(present, {
      ...DEFAULT_GIT_DISPLAY_FLAGS,
      showGitBranch: false, showGitDirty: false, showGitUpstream: false, showGitDiffstat: false,
    }, t)).toEqual([])
    expect(gitChips({
      ...present, ahead: 0, behind: 2, insertions: 5, deletions: 0,
    }, DEFAULT_GIT_DISPLAY_FLAGS, t)).toEqual(['feat/stats', '3', '↓2', '+5'])
  })
})

describe('WorkspaceGitChip', () => {
  it('renders joined chips and hides a miss', async () => {
    const sampleGit = vi.fn(async (): Promise<WorkspaceGitSample> => present)
    mount(sampleGit)
    expect((await screen.findByLabelText('Workspace Git')).textContent)
      .toBe('feat/stats · 3 · ↑2 ↓1 · +120 −30')
    expect(screen.getByLabelText('Workspace Git').getAttribute('title'))
      .toBe('Working-tree added and deleted lines versus HEAD, not this conversation')
    cleanup()
    mount(vi.fn(async (): Promise<WorkspaceGitSample> => ({ present: false })))
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByLabelText('Workspace Git')).toBeNull()
  })

  it('does not sample when every git flag is off or cwd is missing', async () => {
    const sampleGit = vi.fn(async (): Promise<WorkspaceGitSample> => present)
    mount(sampleGit, {
      ...DEFAULT_GIT_DISPLAY_FLAGS,
      showGitBranch: false, showGitDirty: false, showGitUpstream: false, showGitDiffstat: false,
    })
    await act(async () => { await Promise.resolve() })
    expect(sampleGit).not.toHaveBeenCalled()
    cleanup()
    mount(sampleGit, DEFAULT_GIT_DISPLAY_FLAGS, '')
    await act(async () => { await Promise.resolve() })
    expect(sampleGit).not.toHaveBeenCalled()
    cleanup()
    render(<WorkspaceGitChip {...chipProps(sampleGit, { omitCwd: true })} />)
    await act(async () => { await Promise.resolve() })
    expect(sampleGit).not.toHaveBeenCalled()
  })

  it('hides a rejected sample and polls again', async () => {
    vi.useFakeTimers()
    const sampleGit = vi.fn()
      .mockRejectedValueOnce(new Error('rpc'))
      .mockResolvedValue(present)
    mount(sampleGit)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByLabelText('Workspace Git')).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(GIT_STATUS_POLL_MS) })
    expect(screen.getByLabelText('Workspace Git')).toBeDefined()
  })

  it('waits for each sample to settle before scheduling the next poll', async () => {
    vi.useFakeTimers()
    let resolveSample!: (value: WorkspaceGitSample) => void
    const sampleGit = vi.fn(
      (_path: string, _signal?: AbortSignal) => new Promise<WorkspaceGitSample>((resolve) => { resolveSample = resolve }),
    )
    mount(sampleGit)
    await act(async () => { await Promise.resolve() })
    expect(sampleGit).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(GIT_STATUS_POLL_MS * 3) })
    expect(sampleGit).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveSample(present)
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Workspace Git').textContent).toContain('feat/stats')
    await act(async () => { await vi.advanceTimersByTimeAsync(GIT_STATUS_POLL_MS) })
    expect(sampleGit).toHaveBeenCalledTimes(2)
  })

  it('ignores a late sample after cwd change and aborts the prior signal', async () => {
    vi.useFakeTimers()
    let resolveFirst!: (value: WorkspaceGitSample) => void
    const first = new Promise<WorkspaceGitSample>((resolve) => { resolveFirst = resolve })
    const sampleGit = vi.fn(
      (_path: string, _signal?: AbortSignal): Promise<WorkspaceGitSample> => Promise.resolve(present),
    )
      .mockImplementationOnce(() => first)
      .mockResolvedValue({ ...present, branch: 'next' })
    const byId: Record<SessionId, SessionSummary> = { [SID]: summary('/old') }
    const sessionsStore = createSnapshotStore<SessionListState>({
      ids: [SID],
      byId,
      current: SID, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
    })
    const props = {
      sessionId: SID,
      useSessions: bindSnapshotSelector(sessionsStore),
      useDisplay: bindSnapshotSelector(createSnapshotStore(DEFAULT_GIT_DISPLAY_FLAGS)),
      sampleGit,
      t,
    } as unknown as WorkspaceGitChipProps
    render(<WorkspaceGitChip {...props} />)
    await act(async () => { await Promise.resolve() })
    expect(sampleGit).toHaveBeenCalledTimes(1)
    const firstSignal = sampleGit.mock.calls[0]![1] as AbortSignal
    expect(firstSignal.aborted).toBe(false)

    act(() => {
      sessionsStore.update((draft) => {
        draft.byId[SID]!.cwd = '/new'
      })
    })
    await act(async () => { await Promise.resolve() })
    expect(firstSignal.aborted).toBe(true)
    expect(sampleGit).toHaveBeenCalledTimes(2)
    expect(sampleGit.mock.calls[1]![0]).toBe('/new')

    await act(async () => {
      resolveFirst({ ...present, branch: 'stale' })
      await Promise.resolve()
    })
    expect(screen.getByLabelText('Workspace Git').textContent).toBe('next · 3 · ↑2 ↓1 · +120 −30')
  })

  it('aborts the in-flight sample on unmount and drops its late write', async () => {
    let resolveSample!: (value: WorkspaceGitSample) => void
    const pending = new Promise<WorkspaceGitSample>((resolve) => { resolveSample = resolve })
    const sampleGit = vi.fn(
      (_path: string, _signal?: AbortSignal) => pending,
    )
    const view = mount(sampleGit)
    await act(async () => { await Promise.resolve() })
    const signal = sampleGit.mock.calls[0]![1] as AbortSignal
    view.unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => {
      resolveSample(present)
      await Promise.resolve()
    })
    expect(screen.queryByLabelText('Workspace Git')).toBeNull()
  })
})
