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

/** Status route path registered on the web server. */
export const CHROME_STATUS_PATH = '/api/chrome/status'

/** Public status payload the card renders. */
export interface ChromeStatusPayload {
  /** ready = extension connected; waiting-for-extension = bridge up, no connector yet. */
  state: 'ready' | 'waiting-for-extension' | 'offline' | 'unconfigured'
  url: string
  connector: unknown
  error: string | null
}

/** Compute the current bridge status as the owner. */
export async function computeChromeStatus(
  url: string,
  getIdentity: () => Promise<BridgeOwnerIdentity | undefined>,
): Promise<ChromeStatusPayload> {
  const identity = await getIdentity()
  if (identity === undefined) {
    return {
      state: 'unconfigured',
      url,
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
      connector: connector ?? null,
      error: null,
    }
  } catch (error) {
    return { state: 'offline', url, connector: null, error: String(error) }
  }
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

  return register({
    kind: 'exact',
    path: CHROME_STATUS_PATH,
    handler: async (_req, res) => {
      const payload = await computeChromeStatus(url, getIdentity)
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(JSON.stringify(payload))
    },
  })
}
