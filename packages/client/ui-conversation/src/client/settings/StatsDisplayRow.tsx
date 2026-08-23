/** General Settings block for the five conversation stats-line groups. */
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  STATS_DISPLAY_FIELDS, type ConversationDisplayField, type ConversationDisplayPreferences,
} from '../../submission-settings.ts'
import type { ConversationKey } from '../locales.ts'
import css from './DisplayToggle.module.css'

/** Registration-side display-preference face. */
export interface DisplayPreferenceRowInjected {
  hooks: {
    /** Persisted display flags bound as useDisplay. */
    display: SnapshotStore<ConversationDisplayPreferences>
  }
  /** Change one display flag. */
  setDisplay: (field: ConversationDisplayField, value: boolean) => void
}

/** Full Settings-row props. */
export type StatsDisplayRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'conversation'>
  & InjectFace<DisplayPreferenceRowInjected>

const LABELS = {
  showStatsCounts: 'settings.stats.showStatsCounts',
  showStatsDurations: 'settings.stats.showStatsDurations',
  showStatsLatency: 'settings.stats.showStatsLatency',
  showStatsCacheHit: 'settings.stats.showStatsCacheHit',
  showStatsTokens: 'settings.stats.showStatsTokens',
} as const satisfies Record<typeof STATS_DISPLAY_FIELDS[number], ConversationKey>

/**
 * Render the stats-line display-preference switches.
 * @param props - composed Settings slot props.
 * @returns the preference block.
 */
export function StatsDisplayRow({ useDisplay, setDisplay, t }: StatsDisplayRowProps) {
  const prefs = useDisplay(value => value)
  return (
    <div className={css.block}>
      <div className={css.heading}>
        <div className={css.title}>{t('settings.stats.title')}</div>
        <div className={css.desc}>{t('settings.stats.description')}</div>
      </div>
      {STATS_DISPLAY_FIELDS.map((field) => {
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
