/**
 * Public sample vocabulary for the Host cwd git Remote.
 * This module contains types only so generated Remote clients can consume it
 * without importing Host runtime code.
 * @module @deepseek-ai/dsh-workspace-git/types
 */

/**
 * One cwd's git facts for header chrome. `present: false` when the path is
 * empty, not a work tree, git is missing, or the sample timed out or aborted.
 * Added and deleted lines are `git diff --shortstat HEAD`; untracked files
 * raise `dirty` only.
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
