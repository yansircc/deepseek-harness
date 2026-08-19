/**
 * First-class Cursor subagent backend. Unlike the generic ACP provider, the
 * Cursor backend keeps ONE warm `agent acp` server per model and serves every
 * delegation on a pooled connection — one ACP session per run — so repeated
 * small tasks skip the per-run process cold start entirely. It also replaces
 * the binary allow/reject permission choice with a three-tier policy
 * (`deny`/`allowEdits`/`allow`) keyed on the ACP tool kind, and it can route
 * child models through per-model pools (`--model <model> acp`).
 *
 * The child is still remote and self-contained: it shares no Cordis context,
 * receives only the standalone task text plus the parent session's workspace
 * cwd (see {@link resolveSessionCwd}), and advertises exactly one start
 * capability — `depthLimit`, enforced locally against the parent's delegation
 * depth. Continuable children remain seam-level work (see the subagent seam's
 * Known Limitations).
 *
 * This plugin uses named exports only; a default would hide its loader
 * metadata (see `docs/postmortem/0001-acp-default-export-drops-inject.md`).
 * @module @deepseek-ai/dsh-subagent-cursor
 */

import { accessSync, constants, statSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  resolveChildDepth,
  type ResolvedSubagentStartRequest,
  type SubagentCapabilities,
  type SubagentProvider,
  type SubagentStartRequest,
} from '@deepseek-ai/dsh-subagent'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { CursorPool, type PermissionPolicy } from './pool.ts'
import type { ToolKind } from '@agentclientprotocol/sdk'
import { startCursorRun } from './run.ts'

export const name = 'subagent-cursor'
export const inject = ['subagents', 'subprocess']

/** Config: how to spawn and pool the child Cursor ACP agent processes. */
export interface Config {
  /** Provider name on `ctx.subagents` (default `cursor`). */
  providerName: string
  /** The executable to spawn (the Cursor agent CLI, e.g. `agent`). */
  command: string
  /**
   * Optional model key for the child. Absent → the child uses Cursor's own
   * configured model; present → each pool is keyed by it and spawns
   * `--model <model> acp`, so one provider can serve several models.
   */
  model?: string
  /** Extra arguments placed before `acp` (e.g. `--trust`). */
  args?: string[]
  /**
   * How to auto-answer the child's `session/request_permission` prompts:
   * `deny` (default — decline every prompt), `allowEdits` (approve only the
   * tool kinds in {@link Config.allowEditsKinds}), or `allow` (approve via the
   * first `allow_once`/`allow_always` option). No prompt is surfaced to a human.
   */
  permission?: PermissionPolicy
  /** Tool kinds approved under `permission: allowEdits`; every other kind is cancelled. */
  allowEditsKinds?: ToolKind[]
  /**
   * Maximum concurrent pooled connections (and therefore concurrent Cursor
   * runs) per model. At most one active ACP session per connection.
   */
  poolSize?: number
  /** Idle time before a released connection is closed and reaped. */
  idleTtlMs?: number
  /** Bound on the per-connection ACP `initialize` handshake. */
  initTimeoutMs?: number
  /**
   * Working-directory override used for BOTH the pooled process and its
   * sessions. Must be non-empty; a relative path resolves against the harness
   * launch directory at load, and the result must be an existing directory.
   * When omitted, the pooled process runs in the harness launch directory
   * while every delegation's SESSION inherits its parent session's cwd.
   */
  cwd?: string
  /**
   * Extra environment variables for the child process. Forwarded on top of a
   * credential-scrubbed copy of the parent env, so an explicit key here
   * reaches the child while ambient secrets do not leak implicitly.
   */
  env?: Record<string, string>
  /** Grace period (ms) for the child's EOF-driven quiesce on close. */
  disposeEofGraceMs?: number
  /** Termination-escalation grace (ms); must not exceed `MAX_TIMER_DELAY_MS`. */
  disposeGraceMs?: number
}

export const Config: z<Config> = z.object({
  providerName: z.string().default('cursor'),
  command: z.string().required(),
  model: z.string(),
  args: z.array(z.string()).default([]),
  permission: z.union(['deny', 'allowEdits', 'allow'] as const).default('deny'),
  allowEditsKinds: z.array(z.union(
    ['read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'switch_mode', 'other'] as const,
  )).default(['edit', 'delete', 'move']),
  poolSize: z.number().default(2),
  idleTtlMs: z.number().default(30_000),
  initTimeoutMs: z.number().default(30_000),
  cwd: z.string(),
  env: z.dict(z.string()).default({}),
  disposeEofGraceMs: z.number().default(6_000),
  disposeGraceMs: z.number().default(3_000),
})

/** A bounded positive-finite timer value must fit the single Node timer that owns its tier. */
function assertPositiveFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_TIMER_DELAY_MS) {
    throw new Error(`subagent-cursor: ${name} must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`)
  }
}

/** The shape after schemastery applied the defaults (cwd has none). */
type ResolvedConfig = Required<Omit<Config, 'cwd' | 'model'>> & Pick<Config, 'cwd' | 'model'>

/**
 * Whether `path` names an existing directory the harness can ENTER. The
 * search-permission probe matters: `statSync().isDirectory()` is true for a
 * mode-600 directory, but a subprocess cwd needs `X_OK` or spawn fails EACCES.
 */
function isDirectory(path: string): boolean {
  try {
    if (!statSync(path).isDirectory()) return false
    accessSync(path, constants.X_OK)
    return true
  } catch {
    // statSync/accessSync throw only filesystem access errors here
    // (ENOENT/EACCES/ENOTDIR/…), and every one of them means the path cannot
    // serve as the child's cwd.
    return false
  }
}

/**
 * Assert `cwd` can actually host the child: absolute (it doubles as the ACP
 * session workspace, and a relative path would be re-anchored to the server
 * process's launch directory) and an existing directory (fail here, before the
 * process boundary, instead of as an ambiguous spawn ENOENT).
 * @param label - which source supplied the value, for the diagnostic.
 * @param cwd - the candidate working directory.
 * @returns `cwd`, validated.
 */
function assertUsableCwd(label: string, cwd: string): string {
  if (!isAbsolute(cwd)) {
    throw new Error(`subagent-cursor: ${label} must be an absolute path: ${cwd}`)
  }
  if (!isDirectory(cwd)) {
    throw new Error(`subagent-cursor: ${label} is not an accessible directory: ${cwd}`)
  }
  return cwd
}

/**
 * Resolve the SESSION workspace for one delegation: the deployment `cwd`
 * override when configured (already validated at load), else the parent
 * session's workspace cwd (validated here, its earliest resolvable point).
 * Fails loud when neither exists — falling back to the harness process cwd
 * would silently bind the child's session to the server's launch directory
 * instead of the delegating session's workspace.
 */
function resolveSessionCwd(configured: string | undefined, request: SubagentStartRequest): string {
  if (configured !== undefined) return configured
  const parentCwd = request.parent.session.header.cwd
  if (parentCwd === undefined) {
    throw new Error('subagent-cursor: no working directory for the child — configure `cwd` or delegate from a parent session that has one')
  }
  return assertUsableCwd('parent session cwd', parentCwd)
}

/**
 * The Cursor provider. Advertises only `depthLimit`: the recursion cap is
 * enforced LOCALLY (from the parent's delegation depth) before any process
 * work, while the remote Cursor child itself cannot honor
 * `outputSchema`/`toolFilter`/`persona` (the service rejects a request needing
 * any of them before `start` runs).
 */
class CursorProvider implements SubagentProvider {
  readonly capabilities: SubagentCapabilities = { outputSchema: false, depthLimit: true, toolFilter: false, persona: false }
  // Context contract: an out-of-process Cursor child starts fresh — no parent
  // conversation crosses the process boundary.
  readonly inheritsParentContext = false

  constructor(
    readonly name: string,
    private readonly ctx: Context,
    private readonly pool: CursorPool,
    private readonly config: ResolvedConfig,
  ) {}

  start(request: ResolvedSubagentStartRequest) {
    // depthLimit capability: the recursion budget is enforced here, before any
    // pooled process work, using the seam's canonical depth accounting. The
    // resolved depth itself is not persisted — the remote child has no session
    // header — only the cap is checked.
    resolveChildDepth(request.parent, request.maxDepth)
    return startCursorRun(request, {
      pool: this.pool,
      ...(this.config.model === undefined ? {} : { model: this.config.model }),
      cwd: resolveSessionCwd(this.config.cwd, request),
      onError: (error, stopReason) => {
        // The seam forbids `result` rejecting, so a child-level failure is
        // flattened to a stop reason — preserve it here rather than losing it.
        this.ctx.logger.warn(`subagent-cursor "${this.name}": child run failed (${stopReason}): ${error.message}`)
      },
    })
  }
}

export function apply(ctx: Context, config: Config): void {
  // schemastery (Config) has already filled every defaulted field.
  const resolved = config as ResolvedConfig
  assertPositiveFinite('disposeEofGraceMs', resolved.disposeEofGraceMs)
  assertPositiveFinite('disposeGraceMs', resolved.disposeGraceMs)
  assertPositiveFinite('idleTtlMs', resolved.idleTtlMs)
  assertPositiveFinite('initTimeoutMs', resolved.initTimeoutMs)
  if (!Number.isSafeInteger(resolved.poolSize) || resolved.poolSize < 1) {
    throw new Error('subagent-cursor: poolSize must be a positive integer')
  }
  if (resolved.permission === 'allowEdits' && resolved.allowEditsKinds.length === 0) {
    throw new Error('subagent-cursor: permission "allowEdits" needs a non-empty allowEditsKinds list')
  }
  // `path.resolve('')` is the process cwd — an empty string would silently
  // reintroduce the launch-directory fallback this resolution removed.
  if (resolved.cwd === '') {
    throw new Error('subagent-cursor: config cwd must not be empty — omit the key to inherit the parent session cwd')
  }
  // Interpret a relative configured cwd against the harness launch directory
  // ONCE, at load, and fail a misconfigured directory here — not per start.
  const validated: ResolvedConfig = resolved.cwd === undefined
    ? resolved
    : { ...resolved, cwd: assertUsableCwd('config cwd', resolve(resolved.cwd)) }

  // The pooled process itself runs in the harness launch directory unless a
  // deployment cwd override pins it; the per-session workspace is resolved per
  // delegation and announced through `session/new`.
  const pool = new CursorPool({
    command: validated.command,
    ...(validated.model === undefined ? {} : { model: validated.model }),
    args: validated.args,
    permission: validated.permission,
    allowEditsKinds: validated.allowEditsKinds,
    poolSize: validated.poolSize,
    idleTtlMs: validated.idleTtlMs,
    initTimeoutMs: validated.initTimeoutMs,
    processCwd: validated.cwd ?? process.cwd(),
    env: validated.env,
    disposeEofGraceMs: validated.disposeEofGraceMs,
    disposeGraceMs: validated.disposeGraceMs,
    spawn: spec => ctx.subprocess.spawn(spec),
  })
  // Registrations are effects: the pool's long-lived child processes must be
  // closed when this plugin (or the whole app) unloads.
  ctx.effect(() => {
    return async (): Promise<void> => {
      await pool.dispose()
    }
  }, 'subagent-cursor pool teardown')
  ctx.subagents.registerProvider(new CursorProvider(validated.providerName, ctx, pool, validated))
}
