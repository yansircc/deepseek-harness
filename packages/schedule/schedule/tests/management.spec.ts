import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  ScheduleId,
  ScheduleLogError,
  createAfterScheduleRecord,
  createCronScheduleRecord,
  createEveryScheduleRecord,
  decodeScheduleChange,
  foldScheduleEvents,
  resolveRunNow,
  scheduleView,
} from '../src/domain.ts'

function scheduleEvent(data: unknown, seq = 0): SessionEvent {
  return { type: 'schedule/change', seq, time: 1, data } as SessionEvent
}

function createData(id = 'schedule-1', prompt = 'check logs', scheduledAt = '2026-08-05T12:00:00.000Z') {
  return {
    version: 1,
    operation: 'create',
    schedule: { id, kind: 'after', prompt, afterSeconds: 30, scheduledAt },
  }
}

function atCreateData(id = 'schedule-at', prompt = 'join meeting', scheduledAt = '2026-08-06T01:00:00.000Z') {
  return {
    version: 1,
    operation: 'create',
    schedule: { id, kind: 'at', prompt, scheduledAt },
  }
}

function everyCreateData(
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

function cronCreateData(
  id = 'schedule-cron',
  prompt = 'daily',
  scheduledAt = '2026-08-05T09:00:00.000Z',
) {
  return {
    version: 1,
    operation: 'create',
    schedule: { id, kind: 'cron', prompt, expression: '0 9 * * *', timeZone: 'UTC', scheduledAt },
  }
}

describe('version-1 management operation decoding', () => {
  it('decodes and freezes pause, resume, update, and run_now', () => {
    const pause = decodeScheduleChange({ version: 1, operation: 'pause', id: 'schedule-1' })
    expect(pause).toEqual({ version: 1, operation: 'pause', id: 'schedule-1' })
    const resume = decodeScheduleChange({ version: 1, operation: 'resume', id: 'schedule-1' })
    expect(resume).toEqual({ version: 1, operation: 'resume', id: 'schedule-1' })
    const update = decodeScheduleChange({
      version: 1,
      operation: 'update',
      id: 'schedule-1',
      schedule: createData().schedule,
    })
    expect(update).toEqual({
      version: 1,
      operation: 'update',
      id: 'schedule-1',
      schedule: createData().schedule,
    })
    const runNow = decodeScheduleChange({
      version: 1,
      operation: 'run_now',
      id: 'schedule-1',
      at: '2026-08-05T12:30:00.000Z',
    })
    expect(runNow).toEqual({
      version: 1,
      operation: 'run_now',
      id: 'schedule-1',
      at: '2026-08-05T12:30:00.000Z',
    })
    for (const change of [pause, resume, update, runNow]) {
      expect(Object.isFrozen(change)).toBe(true)
    }
    if (update.operation === 'update') {
      expect(Object.isFrozen(update.schedule)).toBe(true)
    }
  })

  it.each([
    { version: 1, operation: 'pause' },
    { version: 1, operation: 'pause', id: 'schedule-1', extra: true },
    { version: 1, operation: 'resume' },
    { version: 1, operation: 'resume', id: 'schedule-1', extra: true },
    { version: 1, operation: 'update', id: 'schedule-1' },
    { version: 1, operation: 'update', schedule: createData().schedule },
    { version: 1, operation: 'update', id: 'schedule-1', schedule: createData().schedule, extra: true },
    { version: 1, operation: 'update', id: 'schedule-1', schedule: { ...createData().schedule, id: 'other' } },
    { version: 1, operation: 'update', id: 'schedule-1', schedule: { ...createData().schedule, prompt: ' ' } },
    { version: 1, operation: 'run_now', id: 'schedule-1' },
    { version: 1, operation: 'run_now', at: '2026-08-05T12:30:00.000Z' },
    { version: 1, operation: 'run_now', id: 'schedule-1', at: 'not-an-instant' },
    { version: 1, operation: 'run_now', id: 'schedule-1', at: '2026-08-05T12:30:00.000Z', extra: true },
  ])('rejects malformed management operations %#', (data) => {
    expect(() => decodeScheduleChange(data)).toThrow(ScheduleLogError)
  })
})

describe('version-1 management operation folding', () => {
  it('folds pause and resume into pausedIds in order', () => {
    const create = scheduleEvent(createData(), 0)
    const pause = scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-1' }, 1)
    expect(foldScheduleEvents([create, pause])).toEqual({
      active: [expect.objectContaining({ id: 'schedule-1' })],
      seenIds: ['schedule-1'],
      pausedIds: ['schedule-1'],
    })
    const resume = scheduleEvent({ version: 1, operation: 'resume', id: 'schedule-1' }, 2)
    expect(foldScheduleEvents([create, pause, resume])).toEqual({
      active: [expect.objectContaining({ id: 'schedule-1' })],
      seenIds: ['schedule-1'],
      pausedIds: [],
    })
    // Repeated pause keeps a single entry and resume clears it.
    expect(foldScheduleEvents([create, pause, pause, resume]).pausedIds).toEqual([])
    // Delete clears the pause flag with the record.
    const remove = scheduleEvent({ version: 1, operation: 'delete', id: 'schedule-1' }, 2)
    expect(foldScheduleEvents([create, pause, remove])).toEqual({
      active: [],
      seenIds: ['schedule-1'],
      pausedIds: [],
    })
    // Strict inactive targets mirror delete and dispatch.
    expect(() => foldScheduleEvents([
      scheduleEvent({ version: 1, operation: 'pause', id: 'missing' }),
    ])).toThrow(/inactive id/)
    expect(() => foldScheduleEvents([
      create,
      pause,
      scheduleEvent({ version: 1, operation: 'resume', id: 'other' }, 2),
    ])).toThrow(/inactive id/)
  })

  it('folds update as an in-place replacement with the same identity', () => {
    const create = scheduleEvent(createData(), 0)
    const updated = { ...createData().schedule, prompt: 'new prompt' }
    const change = scheduleEvent({
      version: 1,
      operation: 'update',
      id: 'schedule-1',
      schedule: updated,
    }, 1)
    expect(foldScheduleEvents([create, change])).toEqual({
      active: [updated],
      seenIds: ['schedule-1'],
      pausedIds: [],
    })
    // Update preserves the pause flag because pause state is keyed by id.
    const pause = scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-1' }, 1)
    const change2 = scheduleEvent({
      version: 1,
      operation: 'update',
      id: 'schedule-1',
      schedule: updated,
    }, 2)
    expect(foldScheduleEvents([create, pause, change2]).pausedIds).toEqual(['schedule-1'])
    expect(() => foldScheduleEvents([
      scheduleEvent({
        version: 1,
        operation: 'update',
        id: 'missing',
        schedule: { ...updated, id: 'missing' },
      }),
    ])).toThrow(/inactive id/)
  })

  it('folds run_now by removing one-shots and advancing recurring records', () => {
    const events = [
      scheduleEvent(createData(), 0),
      scheduleEvent(atCreateData(), 1),
      scheduleEvent(everyCreateData(), 2),
      scheduleEvent(cronCreateData(), 3),
    ]
    const runAt = '2026-08-05T12:30:00.000Z'
    // One-shot after: removed.
    const runAfter = scheduleEvent({
      version: 1, operation: 'run_now', id: 'schedule-1', at: runAt,
    }, 4)
    expect(foldScheduleEvents([...events, runAfter]).active.map(record => record.id))
      .toEqual(['schedule-at', 'schedule-every', 'schedule-cron'])
    // One-shot at: removed.
    const runAtRecord = scheduleEvent({
      version: 1, operation: 'run_now', id: 'schedule-at', at: runAt,
    }, 5)
    expect(foldScheduleEvents([...events, runAtRecord]).active.map(record => record.id))
      .toEqual(['schedule-1', 'schedule-every', 'schedule-cron'])
    // Every: re-anchors to run instant plus one interval.
    const runEvery = scheduleEvent({
      version: 1, operation: 'run_now', id: 'schedule-every', at: runAt,
    }, 6)
    expect(foldScheduleEvents([...events, runEvery]).active.find(record => record.id === 'schedule-every'))
      .toEqual({
        id: 'schedule-every',
        kind: 'every',
        prompt: 'check metrics',
        everySeconds: 300,
        scheduledAt: '2026-08-05T12:35:00.000Z',
      })
    // Cron: advances to the next 09:00 match after the run instant.
    const runCron = scheduleEvent({
      version: 1, operation: 'run_now', id: 'schedule-cron', at: runAt,
    }, 7)
    expect(foldScheduleEvents([...events, runCron]).active.find(record => record.id === 'schedule-cron'))
      .toEqual({
        id: 'schedule-cron',
        kind: 'cron',
        prompt: 'daily',
        expression: '0 9 * * *',
        timeZone: 'UTC',
        scheduledAt: '2026-08-06T09:00:00.000Z',
      })
    // Run-now on a paused recurring record keeps it paused.
    const pause = scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-every' }, 8)
    expect(foldScheduleEvents([...events, pause, runEvery]).pausedIds).toEqual(['schedule-every'])
    // Run-now on a paused one-shot removes the record and clears its pause flag.
    const pauseOneShot = scheduleEvent({ version: 1, operation: 'pause', id: 'schedule-1' }, 8)
    expect(foldScheduleEvents([...events, pauseOneShot, runAfter]).pausedIds).toEqual([])
    expect(() => foldScheduleEvents([
      scheduleEvent({ version: 1, operation: 'run_now', id: 'missing', at: runAt }),
    ])).toThrow(/inactive id/)
  })
})

describe('run-now resolution and paused views', () => {
  it('resolves immediate dispatch outcomes for every record shape', () => {
    const runAt = Date.parse('2026-08-05T12:30:00.000Z')
    const after = createAfterScheduleRecord(ScheduleId('schedule-1'), 'x', 30, 1_000)
    expect(resolveRunNow(after, runAt)).toEqual({ occurrenceAt: '2026-08-05T12:30:00.000Z' })
    const every = createEveryScheduleRecord(ScheduleId('schedule-every'), 'x', 300, 1_000)
    expect(resolveRunNow(every, runAt)).toEqual({
      occurrenceAt: '2026-08-05T12:30:00.000Z',
      nextScheduledAt: '2026-08-05T12:35:00.000Z',
    })
    const cron = createCronScheduleRecord(
      ScheduleId('schedule-cron'),
      'x',
      '0 9 * * *',
      'UTC',
      runAt,
    )
    expect(resolveRunNow(cron, runAt)).toEqual({
      occurrenceAt: '2026-08-05T12:30:00.000Z',
      nextScheduledAt: '2026-08-06T09:00:00.000Z',
    })
    expect(() => resolveRunNow(every, Number.NaN)).toThrow(/run_now at/)
  })

  it('derives views with the paused flag', () => {
    const record = createAfterScheduleRecord(ScheduleId('schedule-1'), 'x', 30, 1_000)
    expect(scheduleView(record, 999, true)).toMatchObject({ paused: true })
    expect(scheduleView(record, 999)).toMatchObject({ paused: false })
  })
})
