/**
 * Stats UI plugin, browser half: composer-dock stats line and the General
 * Settings display-preference row. Projection composition stays package-local.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (composer.dock).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls settings SlotMap (settings.general.item) and settingsScope.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { StatsDisplayPolicy } from './display-policy.ts'
import { StatsDisplayRow } from './StatsDisplayRow.tsx'
import type { StatsDisplayRowInjected } from './StatsDisplayRow.tsx'
import { StatsLine } from './StatsLine.tsx'
import type { StatsLineInjected } from './StatsLine.tsx'
import { en, NS, zh, type ConversationStatsKey } from './locales.ts'
import {
  STATS_SETTINGS_NAMESPACE, type StatsSettings,
} from '../stats-display-settings.ts'

export type { StatsDisplayRowInjected, StatsDisplayRowProps } from './StatsDisplayRow.tsx'
export type { StatsLineInjected, StatsLineProps } from './StatsLine.tsx'
export type { ConversationStatsKey } from './locales.ts'
export type {
  StatsDisplayField, StatsDisplayPreferences, StatsSettings,
} from '../stats-display-settings.ts'
export {
  billedInputTokens, cacheHitPercent, contextOccupancy, deriveStats, formatDuration, formatTokens,
} from './StatsLine.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Composer stats line and General Settings copy. */
    conversationStats: ConversationStatsKey
  }
}

/** Required services for the stats line, settings row, and copy. */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Client plugin body: composer-dock stats line and General Settings toggles.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-stats: dictionaries')

  const settingsScope = ctx.settingsScope.bind<StatsSettings>({
    namespace: STATS_SETTINGS_NAMESPACE,
  })
  const displayPolicy = new StatsDisplayPolicy(settingsScope)
  const displayInject = (): StatsDisplayRowInjected => ({
    hooks: { display: displayPolicy.prefs },
    setDisplay: (field, value) => { displayPolicy.set(field, value) },
  })

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'stats-display',
    order: 30,
    locale: NS,
    inject: displayInject,
  }, StatsDisplayRow))

  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    locale: NS,
    inject: (): StatsLineInjected => ({
      hooks: { display: displayPolicy.prefs },
    }),
  }, StatsLine))
}
