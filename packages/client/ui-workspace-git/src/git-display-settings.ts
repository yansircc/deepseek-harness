/** Workspace-git display preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the workspace-git UI plugin. */
export const WORKSPACE_GIT_SETTINGS_NAMESPACE = 'ui-workspace-git'

/**
 * Boolean fields that hide one workspace-git header chip.
 * Each defaults on; a chip with no data still hides itself when its flag is on.
 */
export const GIT_DISPLAY_FIELDS = [
  'showGitBranch',
  'showGitDirty',
  'showGitUpstream',
  'showGitDiffstat',
] as const

/** One durable workspace-git display-preference field. */
export type WorkspaceGitDisplayField = typeof GIT_DISPLAY_FIELDS[number]

/** Live display flags the workspace-git header chrome reads. */
export type WorkspaceGitDisplayPreferences = Record<WorkspaceGitDisplayField, boolean>

/** Every git display flag on — the schema default and the no-preference fallback. */
export const DEFAULT_GIT_DISPLAY_FLAGS: WorkspaceGitDisplayPreferences = {
  showGitBranch: true,
  showGitDirty: true,
  showGitUpstream: true,
  showGitDiffstat: true,
}

/** Durable workspace-git section shared by the Host schema and the browser scope. */
export type WorkspaceGitSettings = WorkspaceGitDisplayPreferences

const displayFlagSchema = z.boolean().default(true)

/** Durable workspace-git schema; also the wire envelope the browser scope validates against. */
export const WorkspaceGitSettingsSchema: z<WorkspaceGitSettings> = z.object({
  showGitBranch: displayFlagSchema,
  showGitDirty: displayFlagSchema,
  showGitUpstream: displayFlagSchema,
  showGitDiffstat: displayFlagSchema,
})

/**
 * Copy the four git display flags out of a validated section.
 * @param section - Host-accepted workspace-git settings.
 * @returns the display-preference record the browser stores live.
 */
export function gitDisplayFlagsOf(section: WorkspaceGitSettings): WorkspaceGitDisplayPreferences {
  return {
    showGitBranch: section.showGitBranch,
    showGitDirty: section.showGitDirty,
    showGitUpstream: section.showGitUpstream,
    showGitDiffstat: section.showGitDiffstat,
  }
}
