/** Local Chrome connector provider configuration. */
import z from '@deepseek-ai/schemastery'

/** Validated startup configuration for the loopback connector provider. */
export interface Config {
  readonly host?: string
  readonly port?: number
  readonly ownerCredentialRef?: string
  readonly commandTimeoutMs?: number
  readonly connectorLeaseMs?: number
  readonly pollWaitMs?: number
  readonly maxAdmittedCommands?: number
}

/** Provider configuration schema; exact numeric bounds are enforced by {@link resolveConfig}. */
export const Config: z<Config> = z.object({
  host: z.string(),
  port: z.number(),
  ownerCredentialRef: z.string(),
  commandTimeoutMs: z.number(),
  connectorLeaseMs: z.number(),
  pollWaitMs: z.number(),
  maxAdmittedCommands: z.number(),
})

/** Fully resolved local provider configuration. */
export interface ResolvedConfig {
  readonly host: string
  readonly port: number
  readonly ownerCredentialRef: string
  readonly commandTimeoutMs: number
  readonly connectorLeaseMs: number
  readonly pollWaitMs: number
  readonly maxAdmittedCommands: number
}

const boundedInteger = (name: string, value: number, minimum: number, maximum: number): number => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a safe integer between ${minimum} and ${maximum}`)
  }
  return value
}

/** Apply defaults and validate all deployment-varying values before binding. */
export const resolveConfig = (config: Config): ResolvedConfig => {
  const host = config.host ?? '127.0.0.1'
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error('chrome-local host must be loopback')
  }
  const ownerCredentialRef = config.ownerCredentialRef ?? 'DSH_CHROME_OWNER_CREDENTIAL'
  if (!/^[_A-Za-z][_A-Za-z0-9]*$/.test(ownerCredentialRef)) {
    throw new Error('ownerCredentialRef must be a POSIX identifier')
  }
  return {
    host,
    port: boundedInteger('port', config.port ?? 17_318, 1, 65_535),
    ownerCredentialRef,
    commandTimeoutMs: boundedInteger('commandTimeoutMs', config.commandTimeoutMs ?? 30_000, 100, 300_000),
    connectorLeaseMs: boundedInteger('connectorLeaseMs', config.connectorLeaseMs ?? 35_000, 1_000, 300_000),
    pollWaitMs: boundedInteger('pollWaitMs', config.pollWaitMs ?? 25_000, 100, 120_000),
    maxAdmittedCommands: boundedInteger('maxAdmittedCommands', config.maxAdmittedCommands ?? 64, 1, 1_024),
  }
}
