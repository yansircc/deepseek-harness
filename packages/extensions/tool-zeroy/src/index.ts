/**
 * DSH plugin for zeroY WordPress site management tools.
 *
 * Registers up to five model-facing tools depending on config:
 * - `zeroy_inspect`  — read typed Connector resources
 * - `zeroy_checkout` — materialize a remote SiteCommit as a local Git checkout
 * - `zeroy_push`     — upload objects, create commits, create PreviewReleases
 * - `zeroy_pair`     — bind a WordPress site (two-step pairing flow)
 * - `zeroy_unpair`   — unbind a WordPress site
 *
 * @module @deepseek-ai/dsh-tool-zeroy
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { Config } from './config.ts'
import { registerZeroYSitesSettings } from './settings.ts'
import { registerInspectTool } from './tools/inspect.ts'
import { registerCheckoutTool } from './tools/checkout.ts'
import { registerPushTool } from './tools/push.ts'
import { registerPairTool, registerUnpairTool } from './tools/pair.ts'
import { registerPairingRoutes } from './pairing.ts'
import { registerPluginDownload } from './plugin-download.ts'

export { Config } from './config.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-zeroy'

/** Services required by this plugin. */
export const inject = ['tools', 'systemPrompt']

/**
 * Register zeroY tools and settings. Called once by the Cordis loader when
 * this plugin is mounted. Tool registration is gated by config flags so a
 * deployment can selectively enable/disable capabilities.
 */
export function apply(ctx: Context, config: Config): void {
  // Register the settings section for site metadata persistence.
  // Falls back to empty when no settings provider is mounted.
  registerZeroYSitesSettings(ctx)

  if (config.inspect !== false) {
    registerInspectTool(ctx)
  }

  if (config.checkout !== false) {
    registerCheckoutTool(ctx)
  }

  if (config.push !== false) {
    registerPushTool(ctx)
  }

  if (config.pairing !== false) {
    registerPairTool(ctx)
    registerUnpairTool(ctx)
    // Browser-driven binding routes (no extension needed): the WebUI card
    // opens /zeroy/connect/start, the user approves in WordPress, and the
    // callback route completes the exchange. Requires the host webserver.
    registerPairingRoutes(ctx)
    // WordPress plugin download: the card links users to the zeroY Runtime
    // Connector ZIP for installation in WordPress.
    registerPluginDownload(ctx)
  }
}
