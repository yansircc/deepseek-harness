/**
 * Host cwd git sample (`ctx.workspaceGit`): porcelain dirty count, branch or
 * detached SHA, upstream ahead/behind, and shortstat versus HEAD. The sample
 * is a client-facing Host read published as the `workspaceGit.sample` Remote;
 * it is never written to the session log.
 * @module @deepseek-ai/dsh-workspace-git
 */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import { sampleWorkspaceGit, type WorkspaceGitSample } from './sample.ts'

export {
  parsePorcelain, parseShortstat, sampleWorkspaceGit,
  type GitRunner, type WorkspaceGitSample,
} from './sample.ts'

/** Plugin config. All optional — `static Config` supplies the defaults. */
export interface Config {
  /**
   * Per-sample budget for the git subprocesses, milliseconds. Covers every
   * child in one `sample()` call.
   */
  timeoutMs?: number
}

/** Config after schemastery fills defaults. */
interface ResolvedConfig {
  timeoutMs: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    workspaceGit: WorkspaceGit
  }
}

/**
 * Host git sample for one cwd. A missing git binary, a path that is not a
 * work tree, or a timeout resolves `{ present: false }` rather than throwing.
 * Caller cancellation rides the final `signal` parameter of the Remote face.
 */
export class WorkspaceGit extends TypertRemoteService {
  static Config: z<Config> = z.object({
    timeoutMs: z.natural().min(1).default(5000),
  })

  private readonly config: ResolvedConfig

  /**
   * @param ctx - host context that publishes `workspaceGit`.
   * @param config - deployment timeout; schemastery has already filled defaults.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'workspaceGit')
    // schemastery (static Config) has already filled the defaulted fields;
    // the assertion records that resolution, not a hidden fallback.
    this.config = config as ResolvedConfig
  }

  /**
   * Sample one cwd. Empty cwd returns `{ present: false }` without spawning git.
   * @param cwd - directory to sample, usually a session cwd.
   * @param signal - caller cancellation combined with `timeoutMs`.
   * @returns the sample for header chrome.
   */
  @Remote('sample')
  sample(cwd: string, signal: AbortSignal): Promise<WorkspaceGitSample> {
    return sampleWorkspaceGit(cwd, this.config.timeoutMs, undefined, signal)
  }
}

export default WorkspaceGit
