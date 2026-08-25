/**
 * Live conversation display preferences. Owns the five stats-line flags and
 * writes each change through the Host settings scope.
 */
import {
  createSnapshotStore, type SettingsScope, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_DISPLAY_FLAGS, displayFlagsOf, type ConversationDisplayField,
  type ConversationDisplayPreferences, type ConversationSettings,
} from '../../submission-settings.ts'

export { DEFAULT_DISPLAY_FLAGS } from '../../submission-settings.ts'
export type { ConversationDisplayField, ConversationDisplayPreferences } from '../../submission-settings.ts'

const sameFlags = (left: ConversationDisplayPreferences, right: ConversationDisplayPreferences): boolean =>
  left.showStatsCounts === right.showStatsCounts
  && left.showStatsDurations === right.showStatsDurations
  && left.showStatsLatency === right.showStatsLatency
  && left.showStatsCacheHit === right.showStatsCacheHit
  && left.showStatsTokens === right.showStatsTokens

/**
 * Display-preference policy used by the General Settings stats row and the
 * stats line. A missing Host scope stays process-local.
 */
export class ConversationDisplayPolicy {
  /** Reactive preference source for Settings rows and chrome. */
  readonly prefs: SnapshotStore<ConversationDisplayPreferences> = createSnapshotStore(DEFAULT_DISPLAY_FLAGS)
  private readonly host: SettingsScope<ConversationSettings> | undefined

  /**
   * @param host - durable preference scope owned by the providing plugin;
   * absent compositions stay process-local. The adoption subscription shares
   * the scope's plugin lifetime — a disposed scope never publishes again, so
   * the policy needs no release hook.
   */
  constructor(host?: SettingsScope<ConversationSettings>) {
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
  set(field: ConversationDisplayField, value: boolean): void {
    const current = this.prefs.getSnapshot()
    if (current[field] === value) return
    this.prefs.set({ ...current, [field]: value })
    void this.host?.set(field, value)
  }

  /**
   * Adopt the scope's accepted durable flags without writing them back.
   * @param host - the constructor-narrowed scope driving this adoption.
   */
  private adopt(host: SettingsScope<ConversationSettings>): void {
    const section = host.getSnapshot().value
    if (section === undefined) return
    const next = displayFlagsOf(section)
    if (sameFlags(this.prefs.getSnapshot(), next)) return
    this.prefs.set(next)
  }
}
