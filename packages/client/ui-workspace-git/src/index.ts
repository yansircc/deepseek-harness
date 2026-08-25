/** Host registration for browser workspace-git display preferences. */

import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  WORKSPACE_GIT_SETTINGS_NAMESPACE, WorkspaceGitSettingsSchema,
} from './git-display-settings.ts'

export {
  DEFAULT_GIT_DISPLAY_FLAGS, GIT_DISPLAY_FIELDS, WORKSPACE_GIT_SETTINGS_NAMESPACE,
  WorkspaceGitSettingsSchema, gitDisplayFlagsOf,
  type WorkspaceGitDisplayField, type WorkspaceGitDisplayPreferences, type WorkspaceGitSettings,
} from './git-display-settings.ts'

/**
 * Register the durable workspace-git section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(WORKSPACE_GIT_SETTINGS_NAMESPACE),
      WorkspaceGitSettingsSchema,
    )
  })
}
