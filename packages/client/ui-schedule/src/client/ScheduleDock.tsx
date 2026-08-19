/**
 * Schedule dock: one compact card above the composer showing the current
 * session's reminders, read entirely from the host-computed `schedule`
 * session projection (seeded by the history tail page, updated by
 * session/projection frames) plus the browser clock. No store, no RPC, no
 * event listener. Renders nothing until the session has at least one active
 * reminder; a paused badge and an expandable list carry the details.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ScheduleRecord, ScheduleProjectionView } from '@deepseek-ai/dsh-schedule/client'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { ScheduleKey } from './locales.ts'
import css from './ScheduleDock.module.css'

/** Stable empty lists so a session without reminders keeps one identity. */
const NO_RECORDS: readonly ScheduleRecord[] = []
const NO_IDS: readonly string[] = []

/** One outline clock glyph (no clock icon ships in the primitives set). */
function ClockGlyph(): ReactNode {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.8V8l2.2 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Relative countdown in at most one unit; zero renders as overdue text. */
function countdownText(remainingMs: number, t: Translate<ScheduleKey>): string {
  const seconds = Math.ceil(remainingMs / 1_000)
  if (seconds < 60) return t('seconds', { count: seconds })
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return t('minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('hours', { count: hours })
  return t('days', { count: Math.floor(hours / 24) })
}

/** Local HH:MM of one target instant. */
function localClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** One caption for the record's rule (kind plus its parameters). */
function ruleText(record: ScheduleRecord, t: Translate<ScheduleKey>): string {
  switch (record.kind) {
    case 'after': return t('kind.after')
    case 'at': return t('kind.at')
    case 'every': {
      const minutes = record.everySeconds / 60
      return Number.isInteger(minutes)
        ? `${t('kind.every')} · ${t('every.minutes', { count: minutes })}`
        : `${t('kind.every')} · ${t('every.seconds', { count: record.everySeconds })}`
    }
    case 'cron': return `${t('kind.cron')} · ${t('cron.rule', { expression: record.expression, zone: record.timeZone })}`
  }
}

/**
 * Dock entry: reads the host-computed 'schedule' projection and renders the
 * status card. Paused records keep their frozen target; overdue records are
 * dispatched by the live timer on the next idle boundary.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the compact card and optional list, or null with nothing to show.
 */
export function ScheduleDock(
  props: PropsRuntime<'conversation.input.dock'> & PropsLocale<'schedule'>,
): ReactNode {
  const { useProjection, t } = props
  const projection: ScheduleProjectionView | undefined = useProjection('schedule')
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const active = projection?.active ?? NO_RECORDS
  const paused = useMemo(() => new Set(projection?.pausedIds ?? NO_IDS), [projection?.pausedIds])

  // The clock only runs while the card shows something that moves.
  useEffect(() => {
    if (active.length === 0) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [active.length])

  const rows = useMemo(
    () => [...active].sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt)),
    [active],
  )
  const next = rows[0]
  if (active.length === 0 || next === undefined) return null

  const pausedCount = active.reduce((count, record) => count + Number(paused.has(record.id)), 0)
  const nextTarget = Date.parse(next.scheduledAt)
  const nextPaused = paused.has(next.id)
  const nextDue = !nextPaused && nextTarget <= now
  const nextText = nextPaused
    ? t('paused')
    : nextDue
      ? t('overdue')
      : `${localClock(nextTarget)} · ${t('due.in', { countdown: countdownText(nextTarget - now, t) })}`

  return (
    <div className={css.dock} data-schedule-dock>
      <button
        type="button"
        className={css.bar}
        aria-expanded={open}
        onClick={() => { setOpen(current => !current) }}
      >
        <span className={css.glyph}><ClockGlyph /></span>
        <span className={css.label}>{t('reminders')}</span>
        <span className={css.count}>{active.length}</span>
        {pausedCount > 0 && <span className={css.paused}>{t('paused.count', { count: pausedCount })}</span>}
        <span className={css.next}>{nextText}</span>
        <IconChevronDownOutline14 className={open ? css.chevronOpen : undefined} />
      </button>
      {open && (
        <ul className={css.menu} aria-label={t('list.aria')}>
          {rows.map((record) => {
            const isPaused = paused.has(record.id)
            const target = Date.parse(record.scheduledAt)
            const overdue = !isPaused && target <= now
            const targetText = isPaused
              ? t('paused')
              : overdue
                ? t('overdue')
                : t('due.in', { countdown: countdownText(target - now, t) })
            return (
              <li key={record.id} className={isPaused ? `${css.row} ${css.rowPaused}` : css.row}>
                <span className={css.rule}>{ruleText(record, t)}</span>
                <span className={css.prompt} title={record.prompt}>{record.prompt}</span>
                <span className={css.target}>{targetText}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
