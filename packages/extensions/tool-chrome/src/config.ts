/**
 * Plugin configuration for `@deepseek-ai/dsh-tool-chrome`.
 *
 * @module @deepseek-ai/dsh-tool-chrome/config
 */

import z from '@deepseek-ai/schemastery'

/** Plugin config: bridge address, owner credential, and command limits. */
export interface Config {
  /** Bridge listen host. Defaults to the bridge contract host (127.0.0.1). */
  host?: string
  /** Bridge listen port. Defaults to the bridge contract port (17318). */
  port?: number
  /** Display version reported to the extension. Defaults to the package version. */
  displayVersion?: string
  /** Owner credential reference in ctx.credentials. Defaults to PI_CHROME_OWNER_CREDENTIAL. */
  ownerCredentialRef?: string
  /** Per-command timeout in ms. Defaults to 30000. */
  commandTimeoutMs?: number
}

export const Config: z<Config> = z.object({
  host: z.string(),
  port: z.number(),
  displayVersion: z.string(),
  ownerCredentialRef: z.string(),
  commandTimeoutMs: z.number(),
})
