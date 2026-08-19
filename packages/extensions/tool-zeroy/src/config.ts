/**
 * Plugin configuration for `@deepseek-ai/dsh-tool-zeroy`.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/config
 */

import z from '@deepseek-ai/schemastery'

/** Plugin config: which tools to register and operational limits. */
export interface Config {
  /** Register `zeroy_inspect`. Defaults to true. */
  inspect?: boolean
  /** Register `zeroy_checkout`. Defaults to true. */
  checkout?: boolean
  /** Register `zeroy_push`. Defaults to true. */
  push?: boolean
  /** Register `zeroy_pair` and `zeroy_unpair`. Defaults to true. */
  pairing?: boolean
  /** Maximum concurrent external-check HTTP requests per invocation. Defaults to 4. */
  externalCheckConcurrency?: number
}

export const Config: z<Config> = z.object({
  inspect: z.boolean().default(true),
  checkout: z.boolean().default(true),
  push: z.boolean().default(true),
  pairing: z.boolean().default(true),
  externalCheckConcurrency: z.number().min(1).max(20).default(4),
})
