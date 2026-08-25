/** Stats-line display preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the stats UI plugin. */
export const STATS_SETTINGS_NAMESPACE = 'ui-stats'

/**
 * Boolean fields that hide one stats-line group.
 * Each defaults on; a group with no data still hides itself when its flag is on.
 */
export const STATS_DISPLAY_FIELDS = [
  'showStatsCounts',
  'showStatsDurations',
  'showStatsLatency',
  'showStatsCacheHit',
  'showStatsTokens',
] as const

/** One durable stats-line display-preference field. */
export type StatsDisplayField = typeof STATS_DISPLAY_FIELDS[number]

/** Live display flags the stats line reads. */
export type StatsDisplayPreferences = Record<StatsDisplayField, boolean>

/** Every stats display flag on — the schema default and the no-preference fallback. */
export const DEFAULT_STATS_DISPLAY_FLAGS: StatsDisplayPreferences = {
  showStatsCounts: true,
  showStatsDurations: true,
  showStatsLatency: true,
  showStatsCacheHit: true,
  showStatsTokens: true,
}

/** Durable stats section shared by the Host schema and the browser scope. */
export type StatsSettings = StatsDisplayPreferences

const displayFlagSchema = z.boolean().default(true)

/** Durable stats schema; also the wire envelope the browser scope validates against. */
export const StatsSettingsSchema: z<StatsSettings> = z.object({
  showStatsCounts: displayFlagSchema,
  showStatsDurations: displayFlagSchema,
  showStatsLatency: displayFlagSchema,
  showStatsCacheHit: displayFlagSchema,
  showStatsTokens: displayFlagSchema,
})

/**
 * Copy the five display flags out of a validated section.
 * @param section - Host-accepted stats settings.
 * @returns the display-preference record the browser stores live.
 */
export function statsDisplayFlagsOf(section: StatsSettings): StatsDisplayPreferences {
  return {
    showStatsCounts: section.showStatsCounts,
    showStatsDurations: section.showStatsDurations,
    showStatsLatency: section.showStatsLatency,
    showStatsCacheHit: section.showStatsCacheHit,
    showStatsTokens: section.showStatsTokens,
  }
}
