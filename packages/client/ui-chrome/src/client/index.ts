/**
 * Chrome control configuration card, browser half.
 *
 * Registers the Chrome card into the shared `settings.plugin.item` slot, keyed
 * by the `tool-chrome` namespace the Host tool-chrome plugin serves. The card
 * binds that namespace through the client settings scope, showing setup status
 * and the port / credential settings.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the shared `settings.plugin.item` SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { ChromeCard } from './ChromeCard.tsx'
import { CHROME_NS, ChromeCardController, type ChromeSettings } from './chrome-card-controller.ts'
import { en, NS, zh, type ChromeLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Chrome control card's copy. */
    'settings.chrome': ChromeLocaleKey
  }
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope', 'connection', 'remote']

/**
 * Mount the Chrome control card.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-chrome: dictionaries')

  const controller = new ChromeCardController(
    ctx.settingsScope.bind<ChromeSettings>({ namespace: CHROME_NS }),
  )

  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: CHROME_NS,
      locale: NS,
      inject: () => controller.actions(),
    }, ChromeCard)
  })
}

// Re-export the face types for the slot contract and tests.
export type { ChromeCardState, ChromeCardFace } from './chrome-card-controller.ts'
export type { ChromeLocaleKey } from './locales.ts'
