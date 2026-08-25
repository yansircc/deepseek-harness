/**
 * The `sessionToolStats` projection unit: a pure fold of matched
 * `tool/call` → `tool/result` pairs into a whole-log tool-call count.
 *
 * Pairing mirrors `sessionStats`'s `toolMs` fold and the client window
 * fold (`deriveStats` in dsh-client-ui-conversation): match by callId,
 * ignore orphan results, and drop unresolved calls at `turn/end` (results
 * land within their turn). This unit owns only the count; wall time stays
 * on `sessionStats.toolMs`.
 *
 * @module @deepseek-ai/dsh-session-tool-stats/projection
 */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'

/** Accumulated whole-log tool-call count (the view is exactly this total). */
interface SessionToolStatsTotals {
  /** Matched tool pairs so far. */
  toolCalls: number
}

/**
 * Fold state: the total plus the in-flight call ids it accrues from.
 * The state is plain JSON per the unit contract (persisted-cache
 * precondition). Presence alone matters; dispatch times are not stored.
 */
interface SessionToolStatsState extends SessionToolStatsTotals {
  /** Tool calls whose result has not landed, keyed by callId. */
  pendingCalls: Record<string, true>
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    sessionToolStats: SessionToolStatsState
  }
}

const sessionToolStatsSchema = z.object({
  toolCalls: z.number().int().nonnegative(),
}).strict()

/**
 * The fold state's shape (total plus in-flight call ids), validated on
 * persisted-cache rows after their `ver` gate — the unit's input boundary.
 * The view is a strict subset of the state, so this schema extends
 * `sessionToolStatsSchema` (the wire output boundary) with the boundary
 * fields.
 */
const sessionToolStatsStateSchema = sessionToolStatsSchema.extend({
  pendingCalls: z.record(z.string(), z.literal(true)),
})

/** The `sessionToolStats` unit registered on `ctx.sessionProjections` (exported for the unit spec). */
export const sessionToolStatsProjectionDefinition = {
  key: 'sessionToolStats',
  stateVersion: 1,
  stateSchema: sessionToolStatsStateSchema,
  init: () => ({
    toolCalls: 0,
    pendingCalls: {},
  }),
  apply: (state, event) => {
    // Every uninteresting event returns the same reference (Object.is gates the change feed).
    switch (event.type) {
      case 'tool/call':
        return { ...state, pendingCalls: { ...state.pendingCalls, [event.data.callId]: true as const } }
      case 'tool/result': {
        // Own-key check: callId is provider-minted (model/tool JSON boundary),
        // so a prototype property name ('constructor', 'toString') on a result
        // with no recorded call must read as unmatched.
        const callId = event.data.message.source.callId
        if (!Object.hasOwn(state.pendingCalls, callId)) return state
        const pendingCalls = Object.fromEntries(
          Object.entries(state.pendingCalls).filter(([id]) => id !== callId),
        )
        return {
          ...state,
          toolCalls: state.toolCalls + 1,
          pendingCalls,
        }
      }
      case 'turn/end':
        // A call whose result never landed belongs to a cancelled or failed
        // turn; results always land within their turn, so drop the leftovers
        // instead of growing persisted state forever.
        return Object.keys(state.pendingCalls).length === 0 ? state : { ...state, pendingCalls: {} }
      default:
        return state
    }
  },
  wire: {
    viewSchema: sessionToolStatsSchema,
    view: state => ({
      toolCalls: state.toolCalls,
    }),
  },
} satisfies ProjectionDefinition<'sessionToolStats', SessionToolStatsState>
