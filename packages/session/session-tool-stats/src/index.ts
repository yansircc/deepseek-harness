/**
 * Function plugin registering the `sessionToolStats` projection unit:
 * whole-log matched tool-call counts served through the session-projection
 * seam (registry snapshot, change feed, and every projection carrier), so
 * clients render a full-session tool count that paging and compaction cannot
 * change. The plugin owns only the fold; delivery is the seam's. Compose
 * beside `sessionStats` when a consumer needs both duration and count.
 *
 * @module @deepseek-ai/dsh-session-tool-stats
 */

import type { Context } from '@deepseek-ai/cordis'
import { sessionToolStatsProjectionDefinition } from './projection.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'session-tool-stats'
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

/**
 * Register the `sessionToolStats` unit; the registration is an effect on this
 * plugin's fiber, so unloading removes the key.
 * @param ctx - registrant context carrying the projection registry.
 */
export function apply(ctx: Context): void {
  ctx.sessionProjections.register(sessionToolStatsProjectionDefinition)
}
