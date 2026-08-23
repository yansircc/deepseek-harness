/** Conversation preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the conversation plugin. */
export const CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation'

/** Field carrying the delivery mode for plain Enter while an agent is busy. */
export const BUSY_ENTER_FIELD = 'busyEnter'

/** Busy-Enter behaviors accepted at settings and input boundaries. */
export const BUSY_ENTER_BEHAVIORS = ['queue', 'steer'] as const

/** Configurable meaning of plain Enter while the addressed agent is busy. */
export type BusyEnterBehavior = typeof BUSY_ENTER_BEHAVIORS[number]

/** Default preserves Enter-as-Queue for running conversations. */
export const DEFAULT_BUSY_ENTER_BEHAVIOR: BusyEnterBehavior = 'queue'

/**
 * Boolean fields that hide one stats-line group or one workspace-git chip.
 * Each defaults on; a group with no data still hides itself when its flag is on.
 */
export const DISPLAY_FLAG_FIELDS = [
  'showStatsCounts',
  'showStatsDurations',
  'showStatsLatency',
  'showStatsCacheHit',
  'showStatsTokens',
  'showGitBranch',
  'showGitDirty',
  'showGitUpstream',
  'showGitDiffstat',
] as const

/** One durable display-preference field. */
export type ConversationDisplayField = typeof DISPLAY_FLAG_FIELDS[number]

/** Live display flags the stats line and workspace-git chrome read. */
export type ConversationDisplayPreferences = Record<ConversationDisplayField, boolean>

/** Stats-line groups, in strip order. */
export const STATS_DISPLAY_FIELDS = [
  'showStatsCounts',
  'showStatsDurations',
  'showStatsLatency',
  'showStatsCacheHit',
  'showStatsTokens',
] as const satisfies readonly ConversationDisplayField[]

/** Workspace-git chips, in header order. */
export const GIT_DISPLAY_FIELDS = [
  'showGitBranch',
  'showGitDirty',
  'showGitUpstream',
  'showGitDiffstat',
] as const satisfies readonly ConversationDisplayField[]

/** Every display flag on — the schema default and the no-preference fallback. */
export const DEFAULT_DISPLAY_FLAGS: ConversationDisplayPreferences = {
  showStatsCounts: true,
  showStatsDurations: true,
  showStatsLatency: true,
  showStatsCacheHit: true,
  showStatsTokens: true,
  showGitBranch: true,
  showGitDirty: true,
  showGitUpstream: true,
  showGitDiffstat: true,
}

/** Durable conversation section shared by the Host schema and the browser scope. */
export interface ConversationSettings extends ConversationDisplayPreferences {
  /** Delivery mode for plain Enter while the addressed agent is busy. */
  busyEnter: BusyEnterBehavior
}

const displayFlagSchema = z.boolean().default(true)

/** Durable conversation schema; also the wire envelope the browser scope validates against. */
export const ConversationSettingsSchema: z<ConversationSettings> = z.object({
  [BUSY_ENTER_FIELD]: z.union([...BUSY_ENTER_BEHAVIORS]).default(DEFAULT_BUSY_ENTER_BEHAVIOR),
  showStatsCounts: displayFlagSchema,
  showStatsDurations: displayFlagSchema,
  showStatsLatency: displayFlagSchema,
  showStatsCacheHit: displayFlagSchema,
  showStatsTokens: displayFlagSchema,
  showGitBranch: displayFlagSchema,
  showGitDirty: displayFlagSchema,
  showGitUpstream: displayFlagSchema,
  showGitDiffstat: displayFlagSchema,
})

/**
 * Copy the nine display flags out of a validated section.
 * @param section - Host-accepted conversation settings.
 * @returns the display-preference record the browser stores live.
 */
export function displayFlagsOf(section: ConversationSettings): ConversationDisplayPreferences {
  return {
    showStatsCounts: section.showStatsCounts,
    showStatsDurations: section.showStatsDurations,
    showStatsLatency: section.showStatsLatency,
    showStatsCacheHit: section.showStatsCacheHit,
    showStatsTokens: section.showStatsTokens,
    showGitBranch: section.showGitBranch,
    showGitDirty: section.showGitDirty,
    showGitUpstream: section.showGitUpstream,
    showGitDiffstat: section.showGitDiffstat,
  }
}
