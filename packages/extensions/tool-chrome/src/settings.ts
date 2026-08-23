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
import { OWNER_CREDENTIAL_REF } from './owner-credential.ts'

/** Durable settings section that stores the local bridge port and owner credential reference. */
export const CHROME_SETTINGS_NAMESPACE = settingsNamespace('tool-chrome')

/** Default local service port the Chrome extension connects to. */
export const DEFAULT_CHROME_PORT = 17318

/** Default owner credential reference. */
export const DEFAULT_OWNER_CREDENTIAL_REF = OWNER_CREDENTIAL_REF

/** Shape of the `tool-chrome` settings section. */
export interface ChromeSettings {
  /** Local service port. */
  port: number
  /** Name of the stored owner credential. */
  ownerCredentialRef: string
}

/** Schema for the `tool-chrome` settings section, with port and credential-ref defaults. */
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
 * @param ctx - plugin context that owns the settings service.
 */
export function registerChromeSettings(ctx: Context): void {
  installSettingsSection(ctx, CHROME_SETTINGS_NAMESPACE, ChromeSettingsSchema, DEFAULT_ENTRY, {
    setSource: (current) => { currentSource = current },
    onChange: () => {},
  })
}

/**
 * Read the resolved Chrome bridge configuration.
 * @returns the live settings snapshot, or composition defaults when no provider is mounted.
 */
export function getChromeSettings(): ChromeSettings {
  return currentSource()
}
