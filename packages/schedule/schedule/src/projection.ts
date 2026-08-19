/**
 * `schedule` session-projection unit: an incremental fold of the durable
 * `schedule/change` stream into plain-JSON state. Projection-grade by design
 * (see the session-projection subsystem): the state is plain JSON for the
 * persisted cache, unrelated or malformed events return the same reference
 * (the registry's Object.is gate), and correctness of written changes is the
 * write side's job — the tools validated the transition before appending.
 * @module @deepseek-ai/dsh-schedule
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ZodType } from 'zod'
import { z as zod } from 'zod'
import type { ScheduleProjectionView, ScheduleRecord, ScheduleChange } from './types.ts'
import { decodeScheduleChange, dispatchedRecord, resolveRunNow } from './domain.ts'

/** Empty projection state: no active records, nothing paused. */
const EMPTY = Object.freeze({
  active: Object.freeze([] as readonly ScheduleRecord[]),
  pausedIds: Object.freeze([] as readonly string[]),
})

/** Wire payload schema of the `schedule` projection. */
const scheduleProjectionSchema = zod.object({
  active: zod.array(zod.discriminatedUnion('kind', [
    zod.object({
      id: zod.string().min(1),
      kind: zod.literal('after'),
      prompt: zod.string().min(1),
      afterSeconds: zod.number().int().positive(),
      scheduledAt: zod.string().min(1),
    }),
    zod.object({
      id: zod.string().min(1),
      kind: zod.literal('at'),
      prompt: zod.string().min(1),
      scheduledAt: zod.string().min(1),
    }),
    zod.object({
      id: zod.string().min(1),
      kind: zod.literal('every'),
      prompt: zod.string().min(1),
      everySeconds: zod.number().int().positive(),
      scheduledAt: zod.string().min(1),
    }),
    zod.object({
      id: zod.string().min(1),
      kind: zod.literal('cron'),
      prompt: zod.string().min(1),
      expression: zod.string().min(1),
      timeZone: zod.string().min(1),
      scheduledAt: zod.string().min(1),
    }),
  ])),
  pausedIds: zod.array(zod.string().min(1)),
  // Branded ids make the inferred output incomparable to ScheduleRecord; the
  // registry only calls parse() for validation, so the cast is safe.
}) as unknown as ZodType<ScheduleProjectionView>

/**
 * Build the empty projection state.
 * @returns a frozen state with no active records.
 */
export function initialScheduleProjectionState(): ScheduleProjectionView {
  return EMPTY
}

/**
 * Apply one committed event to the projection state. Non-`schedule/change`
 * events and malformed schedule payloads return the same reference.
 * @param state - state covering all prior events.
 * @param event - the next committed session event.
 * @returns the next state (same reference when the event is not this unit's).
 */
export function applyScheduleProjection(
  state: ScheduleProjectionView,
  event: SessionEvent,
): ScheduleProjectionView {
  if (event.type !== 'schedule/change') return state
  let change: ScheduleChange
  try {
    change = decodeScheduleChange(event.data)
  } catch (_invalidPersistedScheduleChange) {
    return state
  }
  return applyScheduleChange(state, change)
}

/** Apply one decoded Schedule change to the projection state. */
function applyScheduleChange(
  state: ScheduleProjectionView,
  change: ScheduleChange,
): ScheduleProjectionView {
  switch (change.operation) {
    case 'create': {
      const active = [...state.active, change.schedule]
      return freeze({ ...state, active })
    }
    case 'delete': {
      const active = state.active.filter(record => record.id !== change.id)
      if (active.length === state.active.length && !state.pausedIds.includes(change.id)) {
        return state
      }
      return freeze({
        active,
        pausedIds: state.pausedIds.filter(id => id !== change.id),
      })
    }
    case 'pause':
      if (state.pausedIds.includes(change.id)) return state
      return freeze({ ...state, pausedIds: [...state.pausedIds, change.id] })
    case 'resume': {
      if (!state.pausedIds.includes(change.id)) return state
      return freeze({ ...state, pausedIds: state.pausedIds.filter(id => id !== change.id) })
    }
    case 'update': {
      const index = state.active.findIndex(record => record.id === change.id)
      if (index < 0) return state
      const active = [...state.active]
      active[index] = change.schedule
      return freeze({ ...state, active })
    }
    case 'run_now': {
      const record = state.active.find(item => item.id === change.id)
      if (record === undefined) return state
      const nextScheduledAt = resolveRunNow(record, Date.parse(change.at)).nextScheduledAt
      if (nextScheduledAt === undefined) {
        return freeze({
          active: state.active.filter(item => item.id !== change.id),
          pausedIds: state.pausedIds.filter(id => id !== change.id),
        })
      }
      return freeze({
        ...state,
        active: state.active.map(item =>
          item.id === change.id ? { ...item, scheduledAt: nextScheduledAt } : item),
      })
    }
    case 'dispatch': {
      const record = state.active.find(item => item.id === change.id)
      if (record === undefined) return state
      const next = dispatchedRecord(record, change)
      if (next === undefined) {
        return freeze({
          active: state.active.filter(item => item.id !== change.id),
          pausedIds: state.pausedIds.filter(id => id !== change.id),
        })
      }
      return freeze({
        ...state,
        active: state.active.map(item =>
          item.id === change.id ? next : item),
      })
    }
  }
}

/** Freeze one replacement state before returning it to the registry. */
function freeze(state: ScheduleProjectionView): ScheduleProjectionView {
  return Object.freeze({
    active: Object.freeze([...state.active]),
    pausedIds: Object.freeze([...state.pausedIds]),
  })
}

export { scheduleProjectionSchema }
