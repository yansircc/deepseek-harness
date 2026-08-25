/** General Settings block for the four workspace-git header chips. */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { GIT_DISPLAY_FIELDS, type WorkspaceGitDisplayField, type WorkspaceGitDisplayPreferences } from '../git-display-settings.ts'
import type { WorkspaceGitKey } from './locales.ts'
import css from './GitDisplayRow.module.css'

/** Registration-side display-preference face. */
export interface GitDisplayRowInjected {
  hooks: {
    /** Persisted display flags bound as useDisplay. */
    display: SnapshotStore<WorkspaceGitDisplayPreferences>
  }
  /** Change one display flag. */
  setDisplay: (field: WorkspaceGitDisplayField, value: boolean) => void
}

/** Full Settings-row props. */
export type GitDisplayRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'workspaceGit'>
  & InjectFace<GitDisplayRowInjected>

const LABELS = {
  showGitBranch: 'settings.git.showGitBranch',
  showGitDirty: 'settings.git.showGitDirty',
  showGitUpstream: 'settings.git.showGitUpstream',
  showGitDiffstat: 'settings.git.showGitDiffstat',
} as const satisfies Record<typeof GIT_DISPLAY_FIELDS[number], WorkspaceGitKey>

/**
 * Render the workspace-git display-preference switches.
 * @param props - composed Settings slot props.
 * @returns the preference block.
 */
export function GitDisplayRow({ useDisplay, setDisplay, t }: GitDisplayRowProps) {
  const prefs = useDisplay(value => value)
  return (
    <div className={css.block}>
      <div className={css.heading}>
        <div className={css.title}>{t('settings.git.title')}</div>
        <div className={css.desc}>{t('settings.git.description')}</div>
      </div>
      {GIT_DISPLAY_FIELDS.map((field) => {
        const checked = prefs[field]
        return (
          <button
            key={field}
            type="button"
            className={css.switch}
            role="switch"
            aria-checked={checked}
            onClick={() => { setDisplay(field, !checked) }}
          >
            <span>{t(LABELS[field])}</span>
            <span className={css.track} data-on={checked || undefined} aria-hidden="true">
              <span className={css.thumb} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
