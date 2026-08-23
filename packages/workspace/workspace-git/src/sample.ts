/**
 * One cwd git sample: work-tree detection, HEAD, branch or detached SHA,
 * porcelain dirty count, upstream ahead/behind, and shortstat versus HEAD.
 * @module @deepseek-ai/dsh-workspace-git/sample
 */

import { runNativeCommand } from '@deepseek-ai/dsh-native-command'

/**
 * One cwd's git facts for header chrome. Structurally matches the
 * `workspace.gitStatus` wire type; this package never imports the browser
 * contract. `present: false` when the path is empty, not a work tree, git is
 * missing, or the sample timed out. Added and deleted lines are
 * `git diff --shortstat HEAD`; untracked files raise `dirty` only.
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

/**
 * Testable git argv runner. Implementations must not invoke a shell.
 * @param cwd - directory passed to `git -C`.
 * @param args - git argv after `-C <cwd>`.
 * @param signal - sample budget; abort terminates the child.
 */
export type GitRunner = (
  cwd: string,
  args: readonly string[],
  signal: AbortSignal,
) => Promise<{ stdout: string; stderr: string }>

const defaultRun: GitRunner = (cwd, args, signal) =>
  runNativeCommand('git', ['-C', cwd, ...args], signal)

/**
 * Parse `git status --porcelain=v1 --branch` into dirty count and optional
 * upstream sides. Zero sides stay omitted so chrome can hide them.
 * @param text - porcelain stdout.
 * @returns dirty count plus optional ahead/behind.
 */
export function parsePorcelain(text: string): { dirty: number; ahead?: number; behind?: number } {
  const lines = text.split(/\r?\n/).filter(line => line !== '')
  let ahead: number | undefined
  let behind: number | undefined
  let dirty = 0
  for (const line of lines) {
    if (line.startsWith('## ')) {
      const aheadMatch = /\[ahead (\d+)/.exec(line)
      const behindMatch = /behind (\d+)/.exec(line)
      if (aheadMatch !== null) ahead = Number(aheadMatch[1])
      if (behindMatch !== null) behind = Number(behindMatch[1])
      continue
    }
    dirty += 1
  }
  return {
    dirty,
    ...ahead === undefined ? {} : { ahead },
    ...behind === undefined ? {} : { behind },
  }
}

/**
 * Parse `git diff --shortstat HEAD`. Missing sides are 0 (clean or
 * insertions-only / deletions-only output).
 * @param text - shortstat stdout.
 * @returns insertions and deletions versus HEAD.
 */
export function parseShortstat(text: string): { insertions: number; deletions: number } {
  const insertions = /(\d+) insertions?\(\+\)/.exec(text)
  const deletions = /(\d+) deletions?\(-\)/.exec(text)
  return {
    insertions: insertions === null ? 0 : Number(insertions[1]),
    deletions: deletions === null ? 0 : Number(deletions[1]),
  }
}

/**
 * Sample one cwd. An empty path returns `{ present: false }` without spawning
 * git, so a caller cannot accidentally sample `process.cwd()`.
 * @param cwd - directory to sample.
 * @param timeoutMs - budget for the whole sample, including every git child.
 * @param run - git runner; production uses `git -C` through native-command.
 * @returns the sample, or `{ present: false }` on any miss.
 */
export async function sampleWorkspaceGit(
  cwd: string,
  timeoutMs: number,
  run: GitRunner = defaultRun,
): Promise<WorkspaceGitSample> {
  if (cwd === '') return { present: false }
  const signal = AbortSignal.timeout(timeoutMs)
  try {
    const inside = (await run(cwd, ['rev-parse', '--is-inside-work-tree'], signal)).stdout.trim()
    if (inside !== 'true') return { present: false }
    const shortHead = (await run(cwd, ['rev-parse', '--short', 'HEAD'], signal)).stdout.trim()
    if (shortHead === '') return { present: false }
    let branch: string | undefined
    try {
      const name = (await run(cwd, ['symbolic-ref', '--short', 'HEAD'], signal)).stdout.trim()
      if (name !== '') branch = name
    } catch (error) {
      // Shared sample abort/timeout must not be treated as detached HEAD.
      if (signal.aborted) throw error
      // Detached HEAD: symbolic-ref exits non-zero; omit branch and continue.
    }
    const statusText = (await run(cwd, ['status', '--porcelain=v1', '--branch'], signal)).stdout
    const { dirty, ahead, behind } = parsePorcelain(statusText)
    const shortstat = (await run(cwd, ['diff', '--shortstat', 'HEAD'], signal)).stdout
    const { insertions, deletions } = parseShortstat(shortstat)
    return {
      present: true,
      shortHead,
      dirty,
      insertions,
      deletions,
      ...branch === undefined ? {} : { branch },
      ...ahead === undefined ? {} : { ahead },
      ...behind === undefined ? {} : { behind },
    }
  } catch {
    return { present: false }
  }
}
