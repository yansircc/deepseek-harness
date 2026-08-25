/**
 * Live workspace-git display preferences. Owns the four header-chip flags
 * and writes each change through the Host settings scope.
 */
import {
  createSnapshotStore, type SettingsScope, type SnapshotStore,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  DEFAULT_GIT_DISPLAY_FLAGS, gitDisplayFlagsOf, type WorkspaceGitDisplayField,
  type WorkspaceGitDisplayPreferences, type WorkspaceGitSettings,
} from '../git-display-settings.ts'

export { DEFAULT_GIT_DISPLAY_FLAGS } from '../git-display-settings.ts'
export type { WorkspaceGitDisplayField, WorkspaceGitDisplayPreferences } from '../git-display-settings.ts'

const sameFlags = (left: WorkspaceGitDisplayPreferences, right: WorkspaceGitDisplayPreferences): boolean =>
  left.showGitBranch === right.showGitBranch
  && left.showGitDirty === right.showGitDirty
  && left.showGitUpstream === right.showGitUpstream
  && left.showGitDiffstat === right.showGitDiffstat

/**
 * Display-preference policy used by the General Settings row and the
 * workspace-git header chip. A missing Host scope stays process-local.
 */
export class WorkspaceGitDisplayPolicy {
  /** Reactive preference source for Settings rows and chrome. */
  readonly prefs: SnapshotStore<WorkspaceGitDisplayPreferences> = createSnapshotStore(DEFAULT_GIT_DISPLAY_FLAGS)
  private readonly host: SettingsScope<WorkspaceGitSettings> | undefined

  /**
   * @param host - durable preference scope owned by the providing plugin;
   * absent compositions stay process-local. The adoption subscription shares
   * the scope's plugin lifetime — a disposed scope never publishes again, so
   * the policy needs no release hook.
   */
  constructor(host?: SettingsScope<WorkspaceGitSettings>) {
    this.host = host
    if (host !== undefined) {
      host.subscribe(() => { this.adopt(host) })
      this.adopt(host)
    }
  }

  /**
   * Change one display flag; the live record publishes before the durable write starts.
   * @param field - one of the four git display flags.
   * @param value - whether that chip should render when it has data.
   */
  set(field: WorkspaceGitDisplayField, value: boolean): void {
    const current = this.prefs.getSnapshot()
    if (current[field] === value) return
    this.prefs.set({ ...current, [field]: value })
    void this.host?.set(field, value)
  }

  /**
   * Adopt the scope's accepted durable flags without writing them back.
   * @param host - the constructor-narrowed scope driving this adoption.
   */
  private adopt(host: SettingsScope<WorkspaceGitSettings>): void {
    const section = host.getSnapshot().value
    if (section === undefined) return
    const next = gitDisplayFlagsOf(section)
    if (sameFlags(this.prefs.getSnapshot(), next)) return
    this.prefs.set(next)
  }
}
