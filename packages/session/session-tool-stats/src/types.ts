/**
 * Pure types of the session-tool-stats domain: the ONE home of the
 * `sessionToolStats` projection-key declaration, free of this package's
 * host-side value imports (cordis context, zod). Two namespace projections
 * serve it — `./types` for host consumers, `./client` for client aggregates —
 * with zero content duplication.
 *
 * @module @deepseek-ai/dsh-session-tool-stats/types
 */

// Marks this file a module so the declaration below AUGMENTS the projection
// table instead of declaring an ambient module.
export {}

/**
 * Whole-log matched tool-call count, independent of how much history a client
 * has paged in. The count is 0 until the first matched `tool/call` →
 * `tool/result` pair lands. Unmatched leftovers at `turn/end` do not count.
 */
export interface SessionToolStatsProjection {
  /** Matched tool call→result pairs; unmatched leftovers at `turn/end` do not count. */
  toolCalls: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Whole-log matched tool-call count; see {@link SessionToolStatsProjection}. */
    sessionToolStats: SessionToolStatsProjection
  }
}
