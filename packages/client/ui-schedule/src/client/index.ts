/**
 * Schedule surface plugin, browser half: the reminder status bar entry in
 * the conversation.input.dock strip. Projection-mode surface — the active
 * reminders arrive through `useProjection('schedule')` (seeded by the
 * history tail page, updated by session/projection frames), so this plugin
 * owns no store, no refresh chain, and no event listener. The dock renders
 * nothing until the session has at least one active reminder.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input.dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the `schedule` SessionProjectionMap key merge (single source, the domain's pure outlet).
import type {} from '@deepseek-ai/dsh-schedule/client'
import { ScheduleDock } from './ScheduleDock.tsx'
import { en, NS, zh, type ScheduleKey } from './locales.ts'

export { ScheduleDock } from './ScheduleDock.tsx'
export type { ScheduleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The schedule strip's copy. */
    schedule: ScheduleKey
  }
}

/** Required services for the dock entry and its copy. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: the ScheduleDock entry in the input dock strip.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-schedule: dictionaries')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'schedule',
    // After the goal strip: reminder state is ambient, not a work focus.
    order: 30,
    locale: NS,
  }, ScheduleDock))
}
