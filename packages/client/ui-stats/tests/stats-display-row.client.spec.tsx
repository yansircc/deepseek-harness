// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore, type SessionListState, type WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { StatsDisplayRow } from '../src/client/StatsDisplayRow.tsx'
import type { StatsDisplayRowProps } from '../src/client/StatsDisplayRow.tsx'
import { StatsDisplayPolicy } from '../src/client/display-policy.ts'
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
  const policy = new StatsDisplayPolicy()
  const setDisplay = vi.fn((field: Parameters<StatsDisplayRowProps['setDisplay']>[0], value: boolean) => {
    policy.set(field, value)
  })
  const props: StatsDisplayRowProps = {
    useSessions: emptySessions(),
    useWorkspaces: emptyWorkspaces(),
    useDisplay: bindSnapshotSelector(policy.prefs),
    setDisplay,
    t: makeTranslate(en),
  }
  render(<StatsDisplayRow {...props} />)
  return { policy, setDisplay }
}

describe('StatsDisplayRow', () => {
  it('renders the five stats switches on by default', () => {
    mount()
    expect(screen.getByText('Stats line')).toBeDefined()
    expect(screen.getByRole('switch', { name: 'Turns and steps' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getAllByRole('switch')).toHaveLength(5)
  })

  it('toggles a flag through setDisplay', () => {
    const b = mount()
    fireEvent.click(screen.getByRole('switch', { name: 'Cache hit' }))
    expect(b.setDisplay).toHaveBeenCalledWith('showStatsCacheHit', false)
  })
})
