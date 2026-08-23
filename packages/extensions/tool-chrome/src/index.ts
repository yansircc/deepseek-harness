/**
 * DSH plugin: control a real signed-in Chrome profile through a local bridge
 * and browser extension.
 *
 * Registers 27 atomic `chrome_*` tools plus `chrome_status`. The plugin owns a
 * BridgeServer (local HTTP server) that the Chrome extension connects to.
 * Owner credentials are resolved from `ctx.credentials`.
 *
 * @module @deepseek-ai/dsh-tool-chrome
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { BridgeServer } from './bridge/server.ts'
import {
  EXTENSION_DOWNLOAD_PATH,
  registerExtensionDownload,
} from './bridge/extension-download.ts'
import {
  CHROME_STATUS_PATH,
  registerChromeStatus,
} from './bridge/status-endpoint.ts'
import {
  EXTENSION_PROTOCOL_FINGERPRINT,
  extensionDisplayVersion,
} from './bridge/extension-package.ts'
import {
  forwardCommandToOwner,
  statusFromOwner,
} from './bridge/owner-client.ts'
import { ATOMIC_TOOL_DESCRIPTORS } from './protocol/operations.ts'
import { BRIDGE_HOST, BRIDGE_PORT } from './protocol/bridge-contract.ts'
import { registerChromeSettings, getChromeSettings } from './settings.ts'
import {
  LEGACY_OWNER_CREDENTIAL_REF,
  mintOwnerSecret,
  pinOwnerSecret,
  resolveOwnerSecret,
} from './owner-credential.ts'
import { Config } from './config.ts'
import type { BridgeOwnerIdentity } from './protocol/auth.ts'
import type { SessionContext, WireDomainRequest } from './protocol/schema.ts'

export { Config } from './config.ts'
export { LEGACY_OWNER_CREDENTIAL_REF, OWNER_CREDENTIAL_REF } from './owner-credential.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-chrome'

/** Services required by this plugin. The owner secret is resolved once per process. */
export const inject = ['tools']

/**
 * Session context for a Chrome bridge command.
 * Prefers the calling agent's id from {@link ToolRunContext}; falls back when
 * no agent is present (e.g. direct registry execute without an initiator).
 * @param agent - `exec.agent` from tool execution, or `undefined`.
 * @returns the session envelope attached to forwarded owner commands.
 */
export function sessionContextFor(
  agent: { readonly id?: string } | undefined,
): SessionContext {
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
export function apply(ctx: Context, config: Config): void {
  // Register the settings section for bridge configuration (port, credential ref).
  registerChromeSettings(ctx)
  const chromeSettings = getChromeSettings()

  const host = config.host ?? BRIDGE_HOST
  const port = config.port ?? chromeSettings.port ?? BRIDGE_PORT
  const ownerCredentialRef = config.ownerCredentialRef ?? chromeSettings.ownerCredentialRef

  const server = new BridgeServer({
    host,
    port,
    displayVersion: extensionDisplayVersion,
    // The shipped extension speaks the evidence.json protocol fingerprint; the
    // bridge declares the same pin so the handshake accepts only matching builds.
    protocolFingerprint: EXTENSION_PROTOCOL_FINGERPRINT,
  })

  // Resolve the owner secret once and pin it. The listening bridge HMAC-signs
  // with that value; a later resolve that returns a different secret would
  // make every owner status poll fail.
  const ensureCredential = pinOwnerSecret(async () => {
    const credentials = ctx.get('credentials')
    const existing = await resolveOwnerSecret(
      {
        resolve: async (ref) => {
          if (credentials === undefined) return undefined
          try {
            const resolved = await credentials.resolve(credentialRef(ref))
            return resolved === undefined ? undefined : resolved.value
          } catch {
            // Missing or unreadable stored secret; env is the remaining source.
            return undefined
          }
        },
        ...(credentials === undefined
          ? {}
          : {
            store: async (ref: string, value: string) => {
              await credentials.set(credentialRef(ref), value)
            },
          }),
      },
      process.env,
      ownerCredentialRef,
      LEGACY_OWNER_CREDENTIAL_REF,
    )
    if (existing !== undefined) return existing
    const generated = mintOwnerSecret()
    if (credentials !== undefined) {
      try {
        await credentials.set(credentialRef(ownerCredentialRef), generated)
        ctx.logger.info('tool-chrome: generated and stored owner credential %s', ownerCredentialRef)
      } catch {
        // Credential store rejected the write; keep the generated secret in
        // this process only.
      }
    }
    return generated
  })

  const getIdentity = async (): Promise<BridgeOwnerIdentity | undefined> => {
    const credential = await ensureCredential()
    if (credential.length === 0) return undefined
    return { credential, protocolFingerprint: EXTENSION_PROTOCOL_FINGERPRINT }
  }

  // Serve the extension ZIP and bridge status through the web server (if
  // composed) so the WebUI card can offer a direct download and render the
  // connection dot. The web server may activate after this plugin, so poll
  // briefly for it (headless profiles never compose it, in which case the
  // routes stay unregistered and the card falls back to its hints).
  let disposeDownload: (() => void) | undefined
  let disposeStatus: (() => void) | undefined
  const attemptRouteRegistrations = (): void => {
    if (disposeDownload === undefined) {
      disposeDownload = registerExtensionDownload(ctx, port)
      if (disposeDownload !== undefined) {
        ctx.logger.info('tool-chrome: extension download served at %s', EXTENSION_DOWNLOAD_PATH)
      }
    }
    if (disposeStatus === undefined) {
      disposeStatus = registerChromeStatus(ctx, server.url, getIdentity)
      if (disposeStatus !== undefined) {
        ctx.logger.info('tool-chrome: bridge status served at %s', CHROME_STATUS_PATH)
      }
    }
  }
  attemptRouteRegistrations()
  let routeTries = 0
  const routeTimer = setInterval(() => {
    routeTries += 1
    if ((disposeDownload !== undefined && disposeStatus !== undefined) || routeTries >= 25) {
      clearInterval(routeTimer)
      return
    }
    attemptRouteRegistrations()
  }, 200)
  ctx.effect(() => () => {
    clearInterval(routeTimer)
    disposeDownload?.()
    disposeStatus?.()
  }, 'tool-chrome.web-routes')

  // Start the bridge on plugin activation. The owner credential must be
  // loaded first: every owner route (status, command) is gated on it.
  // Dispose awaits this promise so a harvest or HMR unload cannot leave
  // the listen handle alive after start() loses the race with stop().
  const started = (async () => {
    try {
      const identity = await getIdentity()
      if (identity !== undefined) server.setOwnerCredential(identity.credential)
      await server.start()
      ctx.logger.info('tool-chrome: bridge listening on %s', server.url)
    } catch (error) {
      ctx.logger.warn('tool-chrome: failed to start bridge: %s', String(error))
    }
  })()

  ctx.effect(() => () => started.then(() => server.stop()), 'tool-chrome.bridge')

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
          message: `Owner credential "${ownerCredentialRef}" is not configured. Set it in .credentials.yaml or the environment.`,
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

  // ---- 27 atomic chrome_* tools ----
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
      async execute(args: Record<string, unknown>, exec: ToolRunContext): Promise<unknown> {
        const identity = await getIdentity()
        if (identity === undefined) {
          throw new Error(
            `Owner credential "${ownerCredentialRef}" is not configured. Set it in .credentials.yaml or the environment.`,
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
            sessionContextFor(exec.agent),
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
