/** Host registration for browser stats-line display preferences. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  STATS_SETTINGS_NAMESPACE, StatsSettingsSchema,
} from './stats-display-settings.ts'

export {
  DEFAULT_STATS_DISPLAY_FLAGS, STATS_DISPLAY_FIELDS, STATS_SETTINGS_NAMESPACE,
  StatsSettingsSchema, statsDisplayFlagsOf,
  type StatsDisplayField, type StatsDisplayPreferences, type StatsSettings,
} from './stats-display-settings.ts'

/**
 * Register the durable stats section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(STATS_SETTINGS_NAMESPACE),
      StatsSettingsSchema,
    )
  })
}
