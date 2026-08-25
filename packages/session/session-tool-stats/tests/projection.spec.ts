/**
 * The `sessionToolStats` projection unit: mounting the plugin beside the
 * projection registry serves the whole-log matched tool-call count; compositions
 * without the registry are unaffected; unmounting the plugin removes the key
 * (HMR safety). Wall-time pairing stays on session-stats; this suite pins the
 * count fold against controlled event times.
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { CallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as SessionToolStatsPlugin from '@deepseek-ai/dsh-session-tool-stats'
import { sessionToolStatsProjectionDefinition } from '@deepseek-ai/dsh-session-tool-stats/src/projection.ts'
import type { SessionToolStatsProjection } from '@deepseek-ai/dsh-session-tool-stats/types'

async function harness(withPlugin: boolean): Promise<{ ctx: Context; session: Session }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  if (withPlugin) await ctx.plugin(SessionToolStatsPlugin)
  return { ctx, session: ctx.sessions.create(SessionId('tool-counted')) }
}

/** The all-zero projection value plus overrides, for exact fold expectations. */
function totals(overrides: Partial<SessionToolStatsProjection> = {}): SessionToolStatsProjection {
  return { toolCalls: 0, ...overrides }
}

/** Build one synthetic committed event with a controlled timestamp. */
function at(time: number, type: string, data: unknown): SessionEvent {
  return { type, seq: time, time, data } as unknown as SessionEvent
}

/** Fold a synthetic event list through the definition and view the result. */
function fold(events: readonly SessionEvent[]): SessionToolStatsProjection {
  const state = events.reduce<Parameters<typeof sessionToolStatsProjectionDefinition.apply>[0]>(
    (folded, event) => sessionToolStatsProjectionDefinition.apply(folded, event),
    sessionToolStatsProjectionDefinition.init(),
  )
  return sessionToolStatsProjectionDefinition.wire.view(state)
}

describe('sessionToolStats projection unit (registry drive)', () => {
  it('serves zero on the empty log', async () => {
    const { ctx, session } = await harness(true)
    expect(ctx.sessionProjections.snapshot(session).values.sessionToolStats).toEqual(totals())
  })

  it('counts matched pairs and notifies the change feed with the causing seq', async () => {
    const { ctx, session } = await harness(true)
    const changes: { key: string; value: unknown; seq: number }[] = []
    ctx.sessionProjections.onChanged((_session, key, value, seq) => {
      changes.push({ key, value, seq })
    })
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('tool/call', { turn: 1, step: 1, callId: CallId('a'), name: 'read', arguments: '{}' })
    const resultSeq = session.append('tool/result', {
      turn: 1,
      step: 1,
      message: createToolResultMessage({
        callId: CallId('a'),
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
      }),
    }, { surfaceOp: 'append' }).seq
    session.append('step/end', { turn: 1, step: 1 })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    expect(changes.every(change => change.key === 'sessionToolStats')).toBe(true)
    expect(changes.at(-1)).toEqual({
      key: 'sessionToolStats',
      value: totals({ toolCalls: 1 }),
      seq: resultSeq,
    })
    expect(ctx.sessionProjections.snapshot(session).values.sessionToolStats)
      .toEqual(totals({ toolCalls: 1 }))
  })

  it('folds pairs already in the log when the plugin mounts late (lazy cell build)', async () => {
    const { ctx, session } = await harness(false)
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    session.append('tool/call', { turn: 1, step: 1, callId: CallId('a'), name: 'read', arguments: '{}' })
    session.append('tool/result', {
      turn: 1,
      step: 1,
      message: createToolResultMessage({
        callId: CallId('a'),
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
      }),
    }, { surfaceOp: 'append' })
    session.append('step/end', { turn: 1, step: 1 })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    await ctx.plugin(SessionToolStatsPlugin)
    expect(ctx.sessionProjections.snapshot(session).values.sessionToolStats)
      .toEqual(totals({ toolCalls: 1 }))
  })

  it('has no sessionToolStats key without the plugin, and drops it when the plugin unloads (HMR safety)', async () => {
    const { ctx, session } = await harness(false)
    expect('sessionToolStats' in ctx.sessionProjections.snapshot(session).values).toBe(false)
    const fiber = await ctx.plugin(SessionToolStatsPlugin)
    expect(ctx.sessionProjections.snapshot(session).values.sessionToolStats).toEqual(totals())
    await fiber.dispose()
    expect('sessionToolStats' in ctx.sessionProjections.snapshot(session).values).toBe(false)
  })
})

describe('sessionToolStats count fold (controlled timestamps)', () => {
  it('pairs by callId, ignores orphan results, and prunes leftovers at turn/end', () => {
    const result = (callId: string): unknown =>
      ({ turn: 1, step: 1, message: { source: { kind: 'tool', callId } } })
    expect(fold([
      at(1_100, 'tool/call', { turn: 1, step: 1, callId: 'a', name: 'read', arguments: '{}' }),
      at(1_200, 'tool/call', { turn: 1, step: 1, callId: 'b', name: 'read', arguments: '{}' }),
      at(4_200, 'tool/result', result('b')),
      at(1_600, 'tool/result', result('a')),
      at(5_000, 'tool/result', result('ghost')),
    ])).toEqual(totals({ toolCalls: 2 }))
    expect(fold([
      at(1_100, 'tool/call', { turn: 1, step: 1, callId: 'orphan', name: 'read', arguments: '{}' }),
      at(2_100, 'turn/end', { turn: 1, reason: { kind: 'aborted', reason: { kind: 'legacy' } } }),
      at(9_000, 'tool/result', result('orphan')),
    ])).toEqual(totals())
  })

  it('pairs only own pendingCalls keys: a prototype-name callId without a recorded call stays unmatched', () => {
    const result = (callId: string): unknown =>
      ({ turn: 1, step: 1, message: { source: { kind: 'tool', callId } } })
    expect(fold([
      at(1_500, 'tool/result', result('toString')),
    ])).toEqual(totals())
    expect(fold([
      at(1_100, 'tool/call', { turn: 1, step: 1, callId: 'constructor', name: 'read', arguments: '{}' }),
      at(1_600, 'tool/result', result('constructor')),
    ])).toEqual(totals({ toolCalls: 1 }))
  })
})
