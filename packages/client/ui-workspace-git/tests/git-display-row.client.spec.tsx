// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore, type SessionListState, type WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { GitDisplayRow } from '../src/client/GitDisplayRow.tsx'
import type { GitDisplayRowProps } from '../src/client/GitDisplayRow.tsx'
import { WorkspaceGitDisplayPolicy } from '../src/client/display-policy.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function emptySessions() {
  return bindSnapshotSelector(createSnapshotStore<SessionListState>({
    ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
  }))
}

function emptyWorkspaces() {
  return bindSnapshotSelector(createSnapshotStore<WorkspaceListState>({
    items: [], archivedSessionIds: [], state: 'idle', phase: 'ready', error: null,
    baselinesReady: true, recentWorkspaceId: undefined,
  }))
}

function mount() {
  const policy = new WorkspaceGitDisplayPolicy()
  const setDisplay = vi.fn((field: Parameters<GitDisplayRowProps['setDisplay']>[0], value: boolean) => {
    policy.set(field, value)
  })
  const props: GitDisplayRowProps = {
    useSessions: emptySessions(),
    useWorkspaces: emptyWorkspaces(),
    useDisplay: bindSnapshotSelector(policy.prefs),
    setDisplay,
    t: makeTranslate(en),
  }
  render(<GitDisplayRow {...props} />)
  return { policy, setDisplay }
}

describe('GitDisplayRow', () => {
  it('renders the four git switches on by default', () => {
    mount()
    expect(screen.getByText('Workspace Git')).toBeDefined()
    expect(screen.getByRole('switch', { name: 'Current branch' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getAllByRole('switch')).toHaveLength(4)
  })

  it('toggles a flag through setDisplay', () => {
    const b = mount()
    fireEvent.click(screen.getByRole('switch', { name: 'Added and deleted lines' }))
    expect(b.setDisplay).toHaveBeenCalledWith('showGitDiffstat', false)
  })
})
