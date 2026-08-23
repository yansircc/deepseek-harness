/** Session-header workspace git chrome, gated by the four git display flags. */

import { useEffect, useState } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { WorkspaceGitStatus } from '@deepseek-ai/dsh-client-connection/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationDisplayPreferences } from '../../submission-settings.ts'
import css from './WorkspaceGitChip.module.css'

/** Presentation cadence for a cwd sample; not a deployment knob. */
export const GIT_STATUS_POLL_MS = 5_000

/** Registration-side display flags plus the Host sample. */
export interface WorkspaceGitChipInjected {
  hooks: {
    /** Persisted display flags bound as useDisplay. */
    display: SnapshotStore<ConversationDisplayPreferences>
  }
  /**
   * Sample git status for one cwd. RPC failures become `{ present: false }`.
   * @param path - session cwd.
   * @param signal - optional abort for cwd/settings teardown; ignored writers
   *   still drop results when the effect has cleaned up.
   */
  sampleGit: (path: string, signal?: AbortSignal) => Promise<WorkspaceGitStatus>
}

/** Full header-utility props. */
export type WorkspaceGitChipProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<'conversation'>
  & InjectFace<WorkspaceGitChipInjected>

/**
 * Build the visible chips from one sample and the four git flags.
 * @param status - latest Host sample.
 * @param display - live display flags.
 * @param t - conversation locale seat.
 * @returns ordered chip texts, empty when nothing should render.
 */
export function gitChips(
  status: WorkspaceGitStatus,
  display: ConversationDisplayPreferences,
  t: WorkspaceGitChipProps['t'],
): string[] {
  if (!status.present) return []
  const chips: string[] = []
  if (display.showGitBranch) {
    chips.push(status.branch ?? t('git.detached', { sha: status.shortHead }))
  }
  if (display.showGitDirty && status.dirty > 0) {
    chips.push(String(status.dirty))
  }
  if (display.showGitUpstream) {
    const sides: string[] = []
    if ((status.ahead ?? 0) > 0) sides.push(`↑${String(status.ahead)}`)
    if ((status.behind ?? 0) > 0) sides.push(`↓${String(status.behind)}`)
    if (sides.length > 0) chips.push(sides.join(' '))
  }
  if (display.showGitDiffstat) {
    const sides: string[] = []
    if (status.insertions > 0) sides.push(`+${String(status.insertions)}`)
    if (status.deletions > 0) sides.push(`−${String(status.deletions)}`)
    if (sides.length > 0) chips.push(sides.join(' '))
  }
  return chips
}

/**
 * Right-edge session-header git status. Hidden when every git flag is off,
 * the cwd is unknown, the path is not a work tree, or no enabled chip has data.
 * Polls with a settled-sample `setTimeout` loop so a slow Host sample cannot
 * overlap the next; cwd/settings/unmount abort the in-flight RPC and drop
 * stale writes even when the connection ignores the signal.
 * @param props - session kit, display flags, sample, and locale.
 * @returns the chip row, or null.
 */
export function WorkspaceGitChip({
  sessionId, useSessions, useDisplay, sampleGit, t,
}: WorkspaceGitChipProps) {
  const cwd = useSessions(state => state.byId[sessionId]?.cwd)
  const display = useDisplay(value => value)
  const gitOn = display.showGitBranch
    || display.showGitDirty
    || display.showGitUpstream
    || display.showGitDiffstat
  const [status, setStatus] = useState<WorkspaceGitStatus | null>(null)

  useEffect(() => {
    if (!gitOn || cwd === undefined || cwd === '') {
      setStatus(null)
      return
    }
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = (delay: number): void => {
      timer = setTimeout(() => { void tick() }, delay)
    }
    const tick = async (): Promise<void> => {
      try {
        const next = await sampleGit(cwd, controller.signal)
        if (controller.signal.aborted) return
        setStatus(next)
      } catch {
        // Sample rejection is a miss: hide the chip rather than pin a stale row.
        if (controller.signal.aborted) return
        setStatus(null)
      }
      if (!controller.signal.aborted) schedule(GIT_STATUS_POLL_MS)
    }
    void tick()
    return () => {
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [cwd, gitOn, sampleGit])

  const chips = status === null ? [] : gitChips(status, display, t)
  if (chips.length === 0) return null
  return (
    <div className={css.root} title={t('git.diffstatHint')} aria-label={t('git.aria')}>
      {chips.join(' · ')}
    </div>
  )
}
