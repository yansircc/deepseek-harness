/**
 * Durable and model-facing Schedule value types.
 * @module @deepseek-ai/dsh-schedule
 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type {} from '@deepseek-ai/dsh-session/types'

/** Stable reminder identity that is unique and never reused within one session. */
export type ScheduleId = Branded<'ScheduleId'>

/** Durable one-shot reminder created from a positive delay. */
export interface AfterScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a delayed one-shot reminder. */
  readonly kind: 'after'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Positive safe-integer delay accepted at creation. */
  readonly afterSeconds: number
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}

/** Durable one-shot reminder created from an absolute instant. */
export interface AtScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for an absolute one-shot reminder. */
  readonly kind: 'at'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
}

/** Durable fixed-rate reminder whose next target remains creation-anchor-aligned. */
export interface EveryScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a fixed-rate recurring reminder. */
  readonly kind: 'every'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Fixed safe-integer interval, never below five minutes. */
  readonly everySeconds: number
  /** Earliest anchor-aligned occurrence not yet dispatched. */
  readonly scheduledAt: string
}

/** Durable cron-expression reminder whose next target is the next cron match. */
export interface CronScheduleRecord {
  /** Session-local stable identity. */
  readonly id: ScheduleId
  /** Rule discriminator for a cron-expression recurring reminder. */
  readonly kind: 'cron'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Space-separated 5-field cron expression (minute hour dom month dow). */
  readonly expression: string
  /** IANA time zone the expression is evaluated in. */
  readonly timeZone: string
  /** Next cron match not yet dispatched. */
  readonly scheduledAt: string
}

/** Structured local-calendar input accepted by `schedule_create`. */
export interface LocalAtInput {
  /** Four-digit ISO calendar date. */
  readonly date: string
  /** Local wall-clock time with optional one-to-three digit milliseconds. */
  readonly time: string
  /** Explicit UTC or IANA Area/Location zone. */
  readonly time_zone: string
}

/** Absolute selector accepted by `schedule_create`. */
export type AtInput = string | LocalAtInput

/** One-shot record variants that terminate on an id-only dispatch. */
export type OneShotScheduleRecord = AfterScheduleRecord | AtScheduleRecord

/** Recurring record variants that advance on an accepted-at dispatch. */
export type RecurringScheduleRecord = EveryScheduleRecord | CronScheduleRecord

/** The v1 durable reminder record union. */
export type ScheduleRecord = OneShotScheduleRecord | RecurringScheduleRecord

/** Creates one durable reminder record. */
export interface ScheduleCreateChange {
  readonly version: 1
  readonly operation: 'create'
  readonly schedule: ScheduleRecord
}

/** Deletes one currently active reminder. */
export interface ScheduleDeleteChange {
  readonly version: 1
  readonly operation: 'delete'
  readonly id: ScheduleId
}

/** Pauses one currently active reminder without deleting it. */
export interface SchedulePauseChange {
  readonly version: 1
  readonly operation: 'pause'
  readonly id: ScheduleId
}

/** Resumes one currently paused reminder. */
export interface ScheduleResumeChange {
  readonly version: 1
  readonly operation: 'resume'
  readonly id: ScheduleId
}

/** Replaces one active reminder in place, keeping its identity and pause state. */
export interface ScheduleUpdateChange {
  readonly version: 1
  readonly operation: 'update'
  readonly id: ScheduleId
  /** Full replacement record that must carry the same id. */
  readonly schedule: ScheduleRecord
}

/** Manually dispatches one reminder immediately at an explicit wall-clock instant. */
export interface ScheduleRunNowChange {
  readonly version: 1
  readonly operation: 'run_now'
  readonly id: ScheduleId
  /** Canonical four-digit-year UTC instant at which the reminder fires. */
  readonly at: string
}

/** Records that one active one-shot reminder entered the durable dispatch history. */
export interface OneShotScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
}

/** Records one fixed-rate decision and advances directly past missed occurrences. */
export interface EveryScheduleDispatchChange {
  readonly version: 1
  readonly operation: 'dispatch'
  readonly id: ScheduleId
  /** Wall-clock decision time used to select the latest due occurrence. */
  readonly acceptedAt: string
}

/** Durable dispatch shapes supported by the current rule set. */
export type ScheduleDispatchChange = OneShotScheduleDispatchChange | EveryScheduleDispatchChange

/** Strict version-1 durable Schedule mutation union. */
export type ScheduleChange =
  | ScheduleCreateChange
  | ScheduleDeleteChange
  | SchedulePauseChange
  | ScheduleResumeChange
  | ScheduleUpdateChange
  | ScheduleRunNowChange
  | ScheduleDispatchChange

/** Current delivery timing derived from the durable record and wall clock. */
export type ScheduleState = 'scheduled' | 'overdue'

/** Fixed v1 delivery boundary: the original session must be live. */
export type ScheduleDeliveryMode = 'session-local'

/** Complete model-facing view of one active reminder. */
export type ScheduleView = ScheduleRecord & {
  /** Whether the target remains in the future. */
  readonly state: ScheduleState
  /** Reminder delivery never leaves the owning session. */
  readonly deliveryMode: ScheduleDeliveryMode
  /** Whether the reminder is paused and skipped by the live timer. */
  readonly paused: boolean
}

/**
 * Host-computed whole value of the `schedule` session projection: the active
 * records and paused ids exactly as folded from `schedule/change` events.
 * The client derives overdue state and countdowns from its own clock.
 */
export interface ScheduleProjectionView {
  /** Active records in their original create order. */
  readonly active: readonly ScheduleRecord[]
  /** Active ids currently paused, in pause order. */
  readonly pausedIds: readonly string[]
}

/** Management operations whose persistence barrier may be uncertain. */
export type SchedulePersistenceOperation =
  | 'create'
  | 'list'
  | 'delete'
  | 'pause'
  | 'resume'
  | 'update'
  | 'run_now'

/** Stable error returned for an empty reminder prompt. */
export interface InvalidPromptError {
  readonly code: 'invalid_prompt'
  readonly message: string
}

/** Stable error returned for a missing, conflicting, or unsupported rule selector. */
export interface InvalidSelectorError {
  readonly code: 'invalid_selector'
  readonly message: string
}

/** Stable error returned for an invalid rule or management argument. */
export interface InvalidRuleError {
  readonly code: 'invalid_rule'
  readonly message: string
}

/** Stable error returned for an invalid or unsupported IANA time zone. */
export interface InvalidTimeZoneError {
  readonly code: 'invalid_time_zone'
  readonly message: string
}

/** Stable error returned when an absolute target is not strictly future. */
export interface NotFutureError {
  readonly code: 'not_future'
  readonly message: string
}

/** Stable error returned when the computed instant cannot use a four-digit UTC year. */
export interface TimeOutOfRangeError {
  readonly code: 'time_out_of_range'
  readonly message: string
}

/** Stable error returned when a fixed-rate rule runs more often than supported. */
export interface FrequencyTooHighError {
  readonly code: 'frequency_too_high'
  readonly message: string
}

/** Stable error returned when the durable Schedule stream is malformed. */
export interface CorruptScheduleLogError {
  readonly code: 'corrupt_schedule_log'
  readonly message: string
}

/** Stable error returned when a required persistence checkpoint did not complete. */
export interface PersistenceUncertainError {
  readonly code: 'persistence_uncertain'
  readonly message: string
  readonly operation: SchedulePersistenceOperation
  readonly id?: ScheduleId
}

/** Stable fallback that does not disclose an internal exception. */
export interface InternalScheduleError {
  readonly code: 'internal_error'
  readonly message: string
}

/** Closed v1 Schedule management error union. */
export type ScheduleToolError =
  | InvalidPromptError
  | InvalidSelectorError
  | InvalidRuleError
  | InvalidTimeZoneError
  | NotFutureError
  | TimeOutOfRangeError
  | FrequencyTooHighError
  | CorruptScheduleLogError
  | PersistenceUncertainError
  | InternalScheduleError

/** Canonical `schedule_create` value. */
export type ScheduleCreateValue = ScheduleView | ScheduleToolError

/** Canonical `schedule_list` value. */
export type ScheduleListValue = ScheduleView[] | ScheduleToolError

/** Successful `schedule_delete` value, including the non-mutating not-found result. */
export type ScheduleDeleteResult =
  | { readonly id: ScheduleId; readonly deleted: true }
  | { readonly id: ScheduleId; readonly deleted: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_delete` value. */
export type ScheduleDeleteValue = ScheduleDeleteResult | ScheduleToolError

/** Successful `schedule_update` value, including the non-mutating not-found result. */
export type ScheduleUpdateResult =
  | { readonly id: ScheduleId; readonly updated: true; readonly schedule: ScheduleView }
  | { readonly id: ScheduleId; readonly updated: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_update` value. */
export type ScheduleUpdateValue = ScheduleUpdateResult | ScheduleToolError

/** Successful `schedule_pause` value, including idempotent and not-found results. */
export type SchedulePauseResult =
  | { readonly id: ScheduleId; readonly paused: true }
  | { readonly id: ScheduleId; readonly paused: false; readonly code: 'already_paused' }
  | { readonly id: ScheduleId; readonly paused: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_pause` value. */
export type SchedulePauseValue = SchedulePauseResult | ScheduleToolError

/** Successful `schedule_resume` value, including idempotent and not-found results. */
export type ScheduleResumeResult =
  | { readonly id: ScheduleId; readonly resumed: true }
  | { readonly id: ScheduleId; readonly resumed: false; readonly code: 'not_paused' }
  | { readonly id: ScheduleId; readonly resumed: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_resume` value. */
export type ScheduleResumeValue = ScheduleResumeResult | ScheduleToolError

/** Successful `schedule_run_now` value, including the not-found result. */
export type ScheduleRunNowResult =
  | {
    readonly id: ScheduleId
    readonly dispatched: true
    readonly occurrenceAt: string
    readonly nextScheduledAt?: string
  }
  | { readonly id: ScheduleId; readonly dispatched: false; readonly code: 'schedule_not_found' }

/** Canonical `schedule_run_now` value. */
export type ScheduleRunNowValue = ScheduleRunNowResult | ScheduleToolError

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Versioned Schedule mutation. The owning package validates the complete
     * session-local transition stream before accepting a candidate event.
     */
    'schedule/change': ScheduleChange
  }
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /**
     * The session's active Schedule records and paused ids, folded from the
     * `schedule/change` stream. Absent while no `schedule/change` event has
     * been committed (the client renders nothing for an empty active list).
     */
    schedule: ScheduleProjectionView
  }
}
