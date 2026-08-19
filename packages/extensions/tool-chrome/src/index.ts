/**
 * DSH plugin: control a real signed-in Chrome profile through a local bridge
 * and browser extension.
 *
 * Registers 25 atomic `chrome_*` tools plus `chrome_status`. The plugin owns a
 * BridgeServer (local HTTP server) that the Chrome extension connects to.
 * Owner credentials are resolved from `ctx.credentials`.
 *
 * @module @deepseek-ai/dsh-tool-chrome
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { BridgeServer } from './bridge/server.ts'
import {
  forwardCommandToOwner,
  statusFromOwner,
} from './bridge/owner-client.ts'
import { ATOMIC_TOOL_DESCRIPTORS } from './protocol/operations.ts'
import { BRIDGE_HOST, BRIDGE_PORT } from './protocol/bridge-contract.ts'
import { protocolFingerprint } from './protocol/fingerprint.ts'
import type { Config as ConfigType } from './config.ts'
import type { BridgeOwnerIdentity } from './protocol/auth.ts'
import type { SessionContext, WireDomainRequest } from './protocol/schema.ts'

export { Config, type Config as ConfigType } from './config.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-chrome'

/** Services required by this plugin. */
export const inject = ['tools', 'credentials'] as const

/** Default owner credential reference. */
export const OWNER_CREDENTIAL_REF = 'PI_CHROME_OWNER_CREDENTIAL'

/** The session context this DSH session uses for bridge commands. */
function sessionContextFor(ctx: Context): SessionContext {
  // DSH sessions are identified by the agent's id when available.
  const agent = (ctx as { agent?: { id?: string } }).agent
  return {
    key: agent?.id ? `session:${agent.id}` : 'session:dsh',
    groupTitle: 'DSH session',
    foreground: true,
  }
}

/**
 * Register the chrome tools and start the bridge. Called by the Cordis loader
 * when this plugin is mounted.
 */
export function apply(ctx: Context, config: ConfigType): void {
  const host = config.host ?? BRIDGE_HOST
  const port = config.port ?? BRIDGE_PORT

  const server = new BridgeServer({
    host,
    port,
    displayVersion: () => config.displayVersion ?? '0.1.0-rc.7',
  })

  // Resolve the owner credential from ctx.credentials (or env fallback).
  const credentials = ctx.get('credentials')
  const loadCredential = async (): Promise<string | undefined> => {
    if (credentials !== undefined) {
      try {
        const resolved = await credentials.resolve(credentialRef(OWNER_CREDENTIAL_REF))
        if (resolved !== undefined) return resolved.value
      } catch {
        // fall through to env
      }
    }
    return process.env[OWNER_CREDENTIAL_REF]
  }

  const getIdentity = async (): Promise<BridgeOwnerIdentity | undefined> => {
    const credential = await loadCredential()
    if (credential === undefined || credential.length === 0) return undefined
    return { credential, protocolFingerprint: protocolFingerprint() }
  }

  // Start the bridge on plugin activation.
  void (async () => {
    try {
      await server.start()
      ctx.logger.info('tool-chrome: bridge listening on %s', server.url)
    } catch (error) {
      ctx.logger.warn('tool-chrome: failed to start bridge: %s', String(error))
    }
  })()

  // Stop the bridge when the plugin fiber is disposed.
  ctx.effect(() => () => {
    void server.stop()
  }, 'tool-chrome.bridge')

  // ---- chrome_status ----
  ctx.tools.register(defineTool({
    name: 'chrome_status',
    description:
      'Read the Chrome bridge and connector status without changing it.',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [
        { type: 'text', text: JSON.stringify(value, null, 2) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(_args: Record<string, unknown>): Promise<unknown> {
      const identity = await getIdentity()
      if (identity === undefined) {
        return {
          state: 'error',
          message: `Owner credential "${OWNER_CREDENTIAL_REF}" is not configured. Set it in .credentials.yaml or the environment.`,
        }
      }
      try {
        const status = await statusFromOwner(server.url, identity)
        const connector = status.connector
        return {
          state: connector && connector.connected ? 'ready' : 'waiting-for-extension',
          url: server.url,
          extension: status.extensionExpectation,
          connector: connector ?? null,
        }
      } catch (error) {
        return {
          state: 'offline',
          url: server.url,
          error: String(error),
        }
      }
    },
  } as never))

  // ---- 25 atomic chrome_* tools ----
  for (const descriptor of ATOMIC_TOOL_DESCRIPTORS) {
    ctx.tools.register(defineTool({
      name: descriptor.name,
      description: descriptor.description,
      parameters: descriptor.parameters,
      output: {
        schema: { type: 'json' },
        render: (_args: unknown, value: unknown) => [
          { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
        ],
      },
      isConcurrencySafe: () => false,
      async execute(args: Record<string, unknown>): Promise<unknown> {
        const identity = await getIdentity()
        if (identity === undefined) {
          throw new Error(
            `Owner credential "${OWNER_CREDENTIAL_REF}" is not configured. Set it in .credentials.yaml or the environment.`,
          )
        }
        const input = descriptor.projectInput(args)
        const request: WireDomainRequest = {
          domain: descriptor.domain,
          call: input as never,
        }
        try {
          const value = await forwardCommandToOwner(
            server.url,
            identity,
            request,
            sessionContextFor(ctx),
            config.commandTimeoutMs ?? 30_000,
          )
          // Screenshots are saved into the workspace; everything else passes through.
          const { projectToolResult } = await import('./tools/format.ts')
          return projectToolResult(process.cwd(), descriptor.name, input, value)
        } catch (error) {
          throw new Error(
            `Chrome command ${descriptor.name} failed: ${String(error)}`,
          )
        }
      },
    } as never))
  }
}
