/**
 * Chrome bridge configuration persistence via DSH settings.
 *
 * Stores the local service port and the owner credential reference under the
 * `tool-chrome` namespace. The bridge reads these at startup; a settings
 * provider that is absent falls back to the composition defaults.
 *
 * @module @deepseek-ai/dsh-tool-chrome/settings
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

export const CHROME_SETTINGS_NAMESPACE = settingsNamespace('tool-chrome')

/** Default local service port the Chrome extension connects to. */
export const DEFAULT_CHROME_PORT = 17318

/** Default owner credential reference. */
export const DEFAULT_OWNER_CREDENTIAL_REF = 'PI_CHROME_OWNER_CREDENTIAL'

/** Shape of the `tool-chrome` settings section. */
export interface ChromeSettings {
  /** Local service port. */
  port: number
  /** Name of the stored owner credential. */
  ownerCredentialRef: string
}

export const ChromeSettingsSchema: z<ChromeSettings> = z.object({
  port: z.number().default(DEFAULT_CHROME_PORT),
  ownerCredentialRef: z.string().default(DEFAULT_OWNER_CREDENTIAL_REF),
})

/** Default composition entry. */
const DEFAULT_ENTRY: ChromeSettings = {
  port: DEFAULT_CHROME_PORT,
  ownerCredentialRef: DEFAULT_OWNER_CREDENTIAL_REF,
}

/** Live source thunk; replaced by `installSettingsSection` when a provider mounts. */
let currentSource: () => ChromeSettings = () => DEFAULT_ENTRY

/**
 * Register the `tool-chrome` settings section. Call once during plugin apply().
 */
export function registerChromeSettings(ctx: Context): void {
  installSettingsSection(ctx, CHROME_SETTINGS_NAMESPACE, ChromeSettingsSchema, DEFAULT_ENTRY, {
    setSource: (current) => { currentSource = current },
    onChange: () => {},
  })
}

/** Read the resolved Chrome bridge configuration. */
export function getChromeSettings(): ChromeSettings {
  return currentSource()
}
