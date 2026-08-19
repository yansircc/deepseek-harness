import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  ScheduleId,
  ScheduleInputError,
  createCronScheduleRecord,
  foldScheduleEvents,
  parseCronExpression,
  resolveCronOccurrence,
} from '../src/domain.ts'

const BASE = Date.parse('2026-01-15T10:30:00.000Z')

function event(data: unknown, seq: number): SessionEvent {
  return { type: 'schedule/change', seq, time: BASE, data } as SessionEvent
}

describe('cron expression parsing', () => {
  it('parses a full 5-field expression', () => {
    const parsed = parseCronExpression('0 9 * * 1-5')
    expect(parsed).toBeDefined()
    expect(parsed!.minute.values).toEqual(new Set([0]))
    expect(parsed!.hour.values).toEqual(new Set([9]))
    expect(parsed!.dayOfWeek.values).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('parses wildcards, steps, and ranges', () => {
    const parsed = parseCronExpression('*/15 8-18 * * *')
    expect(parsed).toBeDefined()
    expect(parsed!.minute.values).toEqual(new Set([0, 15, 30, 45]))
    expect(parsed!.hour.values).toEqual(new Set([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]))
  })

  it('rejects wrong field counts', () => {
    expect(parseCronExpression('0 9 * *')).toBeUndefined()
    expect(parseCronExpression('0 9 * * 1 2')).toBeUndefined()
  })

  it('rejects out-of-range values', () => {
    expect(parseCronExpression('60 9 * * *')).toBeUndefined()
    expect(parseCronExpression('0 24 * * *')).toBeUndefined()
    expect(parseCronExpression('0 9 * 13 *')).toBeUndefined()
  })

  it('rejects non-numeric fields', () => {
    expect(parseCronExpression('0 9 * * foo')).toBeUndefined()
  })
})

describe('createCronScheduleRecord', () => {
  it('computes the first future match from the expression', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-1'),
      'daily at 9am',
      '0 9 * * *',
      'UTC',
      BASE,
    )
    expect(record.kind).toBe('cron')
    expect(record.expression).toBe('0 9 * * *')
    expect(record.timeZone).toBe('UTC')
    // BASE = 2026-01-15T10:30Z; next 09:00 is 2026-01-16T09:00Z.
    expect(record.scheduledAt).toBe('2026-01-16T09:00:00.000Z')
  })

  it('handles a time zone offset', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-2'),
      'daily at 9am JST',
      '0 9 * * *',
      'Asia/Tokyo',
      BASE,
    )
    // 09:00 JST = 00:00Z; BASE 10:30Z → next is 2026-01-16T00:00:00.000Z.
    expect(record.scheduledAt).toBe('2026-01-16T00:00:00.000Z')
  })

  it('rejects an invalid expression', () => {
    let caught: unknown
    try {
      createCronScheduleRecord(ScheduleId('schedule-cron-3'), 'bad', 'not a cron', 'UTC', BASE)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ScheduleInputError)
    expect((caught as ScheduleInputError).code).toBe('invalid_rule')
  })

  it('rejects an invalid time zone', () => {
    let caught: unknown
    try {
      createCronScheduleRecord(ScheduleId('schedule-cron-4'), 'bad zone', '0 9 * * *', 'Mars/Olympus', BASE)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ScheduleInputError)
    expect((caught as ScheduleInputError).code).toBe('invalid_time_zone')
  })

  it('rejects an empty prompt', () => {
    let caught: unknown
    try {
      createCronScheduleRecord(ScheduleId('schedule-cron-5'), '  ', '0 9 * * *', 'UTC', BASE)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ScheduleInputError)
    expect((caught as ScheduleInputError).code).toBe('invalid_prompt')
  })
})

describe('resolveCronOccurrence', () => {
  it('advances to the next cron match after dispatch', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-6'),
      'hourly at minute 0',
      '0 * * * *',
      'UTC',
      BASE,
    )
    // BASE 10:30Z → next 11:00Z. Dispatch at 11:05Z → occurrence 11:00Z, next 12:00Z.
    const accepted = Date.parse('2026-01-15T11:05:00.000Z')
    const occurrence = resolveCronOccurrence(record, accepted)
    expect(occurrence.occurrenceAt).toBe('2026-01-15T11:00:00.000Z')
    expect(occurrence.nextScheduledAt).toBe('2026-01-15T12:00:00.000Z')
  })

  it('skips missed occurrences when overdue (latest-only)', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-7'),
      'daily at 9am',
      '0 9 * * *',
      'UTC',
      BASE,
    )
    // Next was 01-16 09:00; dispatch at 01-17 10:00 → latest due is 01-17 09:00, next 01-18.
    const accepted = Date.parse('2026-01-17T10:00:00.000Z')
    const occurrence = resolveCronOccurrence(record, accepted)
    expect(occurrence.occurrenceAt).toBe('2026-01-17T09:00:00.000Z')
    expect(occurrence.nextScheduledAt).toBe('2026-01-18T09:00:00.000Z')
  })

  it('handles a weekday-restricted expression across a weekend', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-8'),
      'weekdays at 9am',
      '0 9 * * 1-5',
      'UTC',
      BASE,
    )
    // 2026-01-15 is a Thursday → next is Friday 01-16 09:00.
    expect(record.scheduledAt).toBe('2026-01-16T09:00:00.000Z')
    // Dispatch Friday; next weekday is Monday 01-19.
    const accepted = Date.parse('2026-01-16T10:00:00.000Z')
    const occurrence = resolveCronOccurrence(record, accepted)
    expect(occurrence.occurrenceAt).toBe('2026-01-16T09:00:00.000Z')
    expect(occurrence.nextScheduledAt).toBe('2026-01-19T09:00:00.000Z')
  })
})

describe('cron folding compatibility', () => {
  it('folds create + dispatch into an advanced active record', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-9'),
      'daily at 9am',
      '0 9 * * *',
      'UTC',
      BASE,
    )
    const folded = foldScheduleEvents([
      event({ version: 1, operation: 'create', schedule: record }, 0),
      event({
        version: 1,
        operation: 'dispatch',
        id: record.id,
        acceptedAt: '2026-01-16T10:00:00.000Z',
      }, 1),
    ])
    expect(folded.active).toHaveLength(1)
    const advanced = folded.active[0]!
    expect(advanced.kind).toBe('cron')
    expect(advanced.scheduledAt).toBe('2026-01-17T09:00:00.000Z')
  })

  it('removes a cron record on delete', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-10'),
      'daily at 9am',
      '0 9 * * *',
      'UTC',
      BASE,
    )
    const folded = foldScheduleEvents([
      event({ version: 1, operation: 'create', schedule: record }, 0),
      event({ version: 1, operation: 'delete', id: record.id }, 1),
    ])
    expect(folded.active).toHaveLength(0)
    expect(folded.seenIds).toEqual([record.id])
  })

  it('survives a round-trip through decode (restart replay)', () => {
    const record = createCronScheduleRecord(
      ScheduleId('schedule-cron-11'),
      'daily at 9am',
      '0 9 * * *',
      'UTC',
      BASE,
    )
    // Re-fold the same create event as a fresh process would after restart.
    const folded = foldScheduleEvents([
      event({ version: 1, operation: 'create', schedule: record }, 0),
    ])
    expect(folded.active[0]).toEqual(record)
  })
})
