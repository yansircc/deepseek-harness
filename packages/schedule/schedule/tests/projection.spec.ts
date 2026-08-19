import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  applyScheduleProjection,
  initialScheduleProjectionState,
  scheduleProjectionSchema,
} from '../src/projection.ts'

function scheduleEvent(data: unknown, seq = 0): SessionEvent {
  return { type: 'schedule/change', seq, time: 1, data } as SessionEvent
}

function afterData(id = 'schedule-1', prompt = 'check logs', scheduledAt = '2026-08-05T12:00:00.000Z') {
  return {
    version: 1,
    operation: 'create',
    schedule: { id, kind: 'after', prompt, afterSeconds: 30, scheduledAt },
  }
}

function everyData(
  id = 'schedule-every',
  prompt = 'check metrics',
  scheduledAt = '2026-08-05T12:05:00.000Z',
) {
  return {
    version: 1,
    operation: 'create',
    schedule: { id, kind: 'every', prompt, everySeconds: 300, scheduledAt },
  }
}

describe('schedule session projection', () => {
  it('starts empty, ignores unrelated events, and survives malformed schedule payloads', () => {
    const empty = initialScheduleProjectionState()
    expect(empty).toEqual({ active: [], pausedIds: [] })
    const unrelated = { type: 'turn/start', seq: 0, time: 1, data: {} } as SessionEvent
    expect(applyScheduleProjection(empty, unrelated)).toBe(empty)
    const malformed = scheduleEvent({ version: 1, operation: 'later', id: 'x' })
    expect(applyScheduleProjection(empty, malformed)).toBe(empty)
  })

  it('folds creates, pause, resume, update, run_now, dispatch, and delete', () => {
    let state = initialScheduleProjectionState()
    state = applyScheduleProjection(state, scheduleEvent(afterData(), 0))
    state = applyScheduleProjection(state, scheduleEvent(everyData(), 1))
    expect(state.active).toHaveLength(2)
    expect(state.pausedIds).toEqual([])

    state = applyScheduleProjection(state, scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-every' }, 2))
    expect(state.pausedIds).toEqual(['schedule-every'])
    // Repeated pause is a no-op: the same reference (registry Object.is gate).
    const paused = state
    state = applyScheduleProjection(state, scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-every' }, 3))
    expect(state).toBe(paused)

    state = applyScheduleProjection(state, scheduleEvent({ version: 1, operation: 'resume', id: 'schedule-every' }, 4))
    expect(state.pausedIds).toEqual([])

    // Update replaces the record in place.
    state = applyScheduleProjection(state, scheduleEvent({
      version: 1,
      operation: 'update',
      id: 'schedule-1',
      schedule: { id: 'schedule-1', kind: 'after', prompt: 'new', afterSeconds: 60, scheduledAt: '2026-08-05T13:00:00.000Z' },
    }, 5))
    expect(state.active.find(record => record.id === 'schedule-1')).toMatchObject({ prompt: 'new', afterSeconds: 60 })

    // Dispatch advances a recurring record.
    state = applyScheduleProjection(state, scheduleEvent({
      version: 1,
      operation: 'dispatch',
      id: 'schedule-every',
      acceptedAt: '2026-08-05T12:17:34.000Z',
    }, 6))
    expect(state.active.find(record => record.id === 'schedule-every'))
      .toMatchObject({ scheduledAt: '2026-08-05T12:20:00.000Z' })

    // Run-now removes a one-shot and clears its pause flag.
    state = applyScheduleProjection(state, scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-1' }, 7))
    state = applyScheduleProjection(state, scheduleEvent({
      version: 1,
      operation: 'run_now',
      id: 'schedule-1',
      at: '2026-08-05T12:30:00.000Z',
    }, 8))
    expect(state.active.map(record => record.id)).toEqual(['schedule-every'])
    expect(state.pausedIds).toEqual([])

    // Delete removes the last record.
    state = applyScheduleProjection(state, scheduleEvent({ version: 1, operation: 'delete', id: 'schedule-every' }, 9))
    expect(state).toEqual({ active: [], pausedIds: [] })
  })

  it('validates its wire payload against the projection schema', () => {
    const state = initialScheduleProjectionState()
    const folded = applyScheduleProjection(state, scheduleEvent(everyData(), 0))
    expect(scheduleProjectionSchema.parse(folded)).toEqual(folded)
    expect(() => scheduleProjectionSchema.parse({ active: [{ id: '', kind: 'at', prompt: 'x', scheduledAt: 'y' }], pausedIds: [] }))
      .toThrow()
  })
})
