/**
 * Live stats-line display preferences. Owns the five group flags and writes
 * each change through the Host settings scope.
 */
import {
  createSnapshotStore, type SettingsScope, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_STATS_DISPLAY_FLAGS, statsDisplayFlagsOf, type StatsDisplayField,
  type StatsDisplayPreferences, type StatsSettings,
} from '../stats-display-settings.ts'

export { DEFAULT_STATS_DISPLAY_FLAGS } from '../stats-display-settings.ts'
export type { StatsDisplayField, StatsDisplayPreferences } from '../stats-display-settings.ts'

const sameFlags = (left: StatsDisplayPreferences, right: StatsDisplayPreferences): boolean =>
  left.showStatsCounts === right.showStatsCounts
  && left.showStatsDurations === right.showStatsDurations
  && left.showStatsLatency === right.showStatsLatency
  && left.showStatsCacheHit === right.showStatsCacheHit
  && left.showStatsTokens === right.showStatsTokens

/**
 * Display-preference policy used by the General Settings stats row and the
 * stats line. A missing Host scope stays process-local.
 */
export class StatsDisplayPolicy {
  /** Reactive preference source for Settings rows and chrome. */
  readonly prefs: SnapshotStore<StatsDisplayPreferences> = createSnapshotStore(DEFAULT_STATS_DISPLAY_FLAGS)
  private readonly host: SettingsScope<StatsSettings> | undefined

  /**
   * @param host - durable preference scope owned by the providing plugin;
   * absent compositions stay process-local. The adoption subscription shares
   * the scope's plugin lifetime — a disposed scope never publishes again, so
   * the policy needs no release hook.
   */
  constructor(host?: SettingsScope<StatsSettings>) {
    this.host = host
    if (host !== undefined) {
      host.subscribe(() => { this.adopt(host) })
      this.adopt(host)
    }
  }

  /**
   * Change one display flag; the live record publishes before the durable write starts.
   * @param field - one of the five display flags.
   * @param value - whether that group should render when it has data.
   */
  set(field: StatsDisplayField, value: boolean): void {
    const current = this.prefs.getSnapshot()
    if (current[field] === value) return
    this.prefs.set({ ...current, [field]: value })
    void this.host?.set(field, value)
  }

  /**
   * Adopt the scope's accepted durable flags without writing them back.
   * @param host - the constructor-narrowed scope driving this adoption.
   */
  private adopt(host: SettingsScope<StatsSettings>): void {
    const section = host.getSnapshot().value
    if (section === undefined) return
    const next = statsDisplayFlagsOf(section)
    if (sameFlags(this.prefs.getSnapshot(), next)) return
    this.prefs.set(next)
  }
}
