/** General Settings block for the four workspace-git header chips. */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { GIT_DISPLAY_FIELDS } from '../../submission-settings.ts'
import type { ConversationKey } from '../locales.ts'
import type { DisplayPreferenceRowInjected } from './StatsDisplayRow.tsx'
import css from './DisplayToggle.module.css'

/** Full Settings-row props. */
export type GitDisplayRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'conversation'>
  & InjectFace<DisplayPreferenceRowInjected>

const LABELS = {
  showGitBranch: 'settings.git.showGitBranch',
  showGitDirty: 'settings.git.showGitDirty',
  showGitUpstream: 'settings.git.showGitUpstream',
  showGitDiffstat: 'settings.git.showGitDiffstat',
} as const satisfies Record<typeof GIT_DISPLAY_FIELDS[number], ConversationKey>

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
