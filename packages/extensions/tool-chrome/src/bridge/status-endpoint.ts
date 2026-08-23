/**
 * Chrome bridge status endpoint: a public web-server route the WebUI card
 * polls to render the connection dot. The host authenticates to the bridge as
 * the owner internally, so the browser never sees the owner credential.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/status-endpoint
 */

import type { Context } from '@deepseek-ai/cordis'
import { statusFromOwner } from './owner-client.ts'
import type { BridgeOwnerIdentity } from '../protocol/auth.ts'
import type { ConnectorStatus } from '../protocol/schema.ts'

/** Status route path registered on the web server. */
export const CHROME_STATUS_PATH = '/api/chrome/status'

/** Extension identity the bridge requires of a connector. */
export interface ChromeExtensionExpectation {
  extensionId: string
  displayVersion: string
  protocolFingerprint: string
}

/**
 * Public connector summary for the WebUI card.
 * Omits `connectorId` and any shared secret.
 */
export interface ChromePublicConnectorSummary {
  extensionId: string
  extensionDisplayVersion: string
  protocolFingerprint: string
  connected: boolean
  label: string
  lastSeenAt?: number
  queuedCommands: number
  pendingCommands: number
}

/** Public status payload the card renders. */
export interface ChromeStatusPayload {
  /** ready = extension connected; waiting-for-extension = bridge up, no connector yet. */
  state: 'ready' | 'waiting-for-extension' | 'offline' | 'unconfigured'
  url: string
  /** Expected extension identity from the bridge, or `null` when unavailable. */
  extensionExpectation: ChromeExtensionExpectation | null
  /** Live or last-reported connector summary, or `null` when none is bound. */
  connector: ChromePublicConnectorSummary | null
  error: string | null
}

/**
 * Project a bridge connector status into the public card summary.
 * @param connector - owner `/status` connector record (no secret on the wire).
 * @returns the secret-free summary the WebUI may render.
 */
export function publicConnectorSummary(
  connector: ConnectorStatus,
): ChromePublicConnectorSummary {
  return {
    extensionId: connector.extensionId,
    extensionDisplayVersion: connector.extensionDisplayVersion,
    protocolFingerprint: connector.protocolFingerprint,
    connected: connector.connected,
    label: connector.label,
    ...(connector.lastSeenAt === undefined ? {} : { lastSeenAt: connector.lastSeenAt }),
    queuedCommands: connector.queuedCommands,
    pendingCommands: connector.pendingCommands,
  }
}

/**
 * Compute the current bridge status as the owner.
 * @param url - bridge origin shown on the payload and used for the owner status fetch.
 * @param getIdentity - resolves the owner identity; `undefined` yields `unconfigured`.
 * @returns `ready` when a connector is connected, `waiting-for-extension` when
 *   the bridge answers without a live connector, `offline` when the owner fetch
 *   fails, or `unconfigured` when no credential is available.
 */
export async function computeChromeStatus(
  url: string,
  getIdentity: () => Promise<BridgeOwnerIdentity | undefined>,
): Promise<ChromeStatusPayload> {
  const identity = await getIdentity()
  if (identity === undefined) {
    return {
      state: 'unconfigured',
      url,
      extensionExpectation: null,
      connector: null,
      error: 'Owner credential is not configured',
    }
  }
  try {
    const status = await statusFromOwner(url, identity)
    const connector = status.connector
    return {
      state: connector !== undefined && connector.connected ? 'ready' : 'waiting-for-extension',
      url,
      extensionExpectation: status.extensionExpectation,
      connector: connector === undefined ? null : publicConnectorSummary(connector),
      error: null,
    }
  } catch (error) {
    return {
      state: 'offline',
      url,
      extensionExpectation: null,
      connector: null,
      error: String(error),
    }
  }
}

/**
 * Remember the last live public connector summary and surface it as disconnected
 * when the bridge reports waiting with no live connector. Retention is process
 * memory only; never persisted and never includes connector ids or secrets.
 * @param payload - fresh status from {@link computeChromeStatus}.
 * @param lastLive - previously retained summary, or null before any live connector.
 * @returns the payload to serve plus the updated retention.
 */
export function retainPublicConnector(
  payload: ChromeStatusPayload,
  lastLive: ChromePublicConnectorSummary | null,
): {
  payload: ChromeStatusPayload
  lastLive: ChromePublicConnectorSummary | null
} {
  if (payload.connector !== null && payload.connector.connected) {
    return { payload, lastLive: payload.connector }
  }
  if (
    payload.state === 'waiting-for-extension'
    && payload.connector === null
    && lastLive !== null
  ) {
    return {
      payload: {
        ...payload,
        connector: { ...lastLive, connected: false },
      },
      lastLive,
    }
  }
  return { payload, lastLive }
}

/**
 * Register the status route on the DSH web server.
 * @param ctx - the plugin context carrying `webServer`.
 * @param url - the bridge base URL.
 * @param getIdentity - resolves the owner identity (credential + fingerprint).
 * @returns the route disposer, or undefined when no web server is composed.
 */
export function registerChromeStatus(
  ctx: Context,
  url: string,
  getIdentity: () => Promise<BridgeOwnerIdentity | undefined>,
): (() => void) | undefined {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) return undefined
  const register = (webServer as unknown as { register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: unknown, res: {
      writeHead(status: number, headers?: Record<string, string | number>): unknown
      end(body: Uint8Array | string): unknown
    }) => void | Promise<void>
  }): () => void }).register.bind(webServer)

  /** Last live public connector summary for this process; not durable. */
  let lastLive: ChromePublicConnectorSummary | null = null

  return register({
    kind: 'exact',
    path: CHROME_STATUS_PATH,
    handler: async (_req, res) => {
      const computed = await computeChromeStatus(url, getIdentity)
      const retained = retainPublicConnector(computed, lastLive)
      lastLive = retained.lastLive
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify(retained.payload))
    },
  })
}
