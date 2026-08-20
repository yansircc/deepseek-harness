/**
 * zeroY sites configuration card, browser half.
 *
 * Registers the zeroY card into the shared `settings.plugin.item` slot, keyed
 * by the `zeroy-sites` namespace the Host tool-zeroy plugin serves. The card
 * binds that namespace through the client settings scope, letting the user
 * manage configured WordPress sites from the Plugins settings section.
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the settings shell's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: the shared `settings.plugin.item` SlotMap declaration.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { ZeroYCard } from './ZeroYCard.tsx'
import { ZEROY_NS, ZeroYCardController, installBindSignalListener, type ZeroYSitesSettings } from './zeroy-card-controller.ts'
import { en, NS, zh, type ZeroYLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The zeroY sites card's copy. */
    'settings.zeroy': ZeroYLocaleKey
  }
}

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope', 'connection', 'remote']

/**
 * Mount the zeroY sites card.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-zeroy: dictionaries')

  const controller = new ZeroYCardController(
    ctx.settingsScope.bind<ZeroYSitesSettings>({ namespace: ZEROY_NS }),
  )

  // The host callback page postMessages the binding outcome back; route it
  // into the controller so the card can clear its in-progress state.
  ctx.effect(() => installBindSignalListener(controller.actions().handleBindSignal),
    'ui-zeroy: bind signal listener')

  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: ZEROY_NS,
      locale: NS,
      inject: () => controller.actions(),
    }, ZeroYCard)
  })
}

// Re-export the face types for the slot contract and tests.
export type { ZeroYCardState, ZeroYCardFace } from './zeroy-card-controller.ts'
export type { ZeroYLocaleKey } from './locales.ts'
