/**
 * One cwd's git facts for header chrome. Matches the Host
 * `@deepseek-ai/dsh-workspace-git` sample vocabulary; kept local so this
 * client package does not import Host runtime or generated Remote artifacts.
 */
export type WorkspaceGitSample =
  | { present: false }
  | {
    present: true
    /** Short HEAD SHA. */
    shortHead: string
    /** Porcelain v1 entry count, including untracked. */
    dirty: number
    /** Insertions versus HEAD. */
    insertions: number
    /** Deletions versus HEAD. */
    deletions: number
    /** Symbolic-ref short name when attached; omitted when detached. */
    branch?: string
    /** Commits ahead of upstream; omitted when no upstream. */
    ahead?: number
    /** Commits behind upstream; omitted when no upstream. */
    behind?: number
  }

/** Alias kept for chip/tests that still name the status face. */
export type WorkspaceGitStatus = WorkspaceGitSample

/** Narrow face of the Host `workspaceGit.sample` Remote used by apply. */
export interface WorkspaceGitRemoteFace {
  /**
   * Sample one cwd.
   * @param cwd - session cwd.
   * @param signal - optional abort for cwd/settings teardown.
   * @returns Typert Remote result; callers map failure to `{ present: false }`.
   */
  sample: (
    cwd: string,
    signal?: AbortSignal,
  ) => Promise<{ ok: true; value: WorkspaceGitSample } | { ok: false }>
}
