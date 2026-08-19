/**
 * Browser-driven zeroY site binding (OAuth2 authorization-code flow with
 * PKCE). No browser extension needed: the WebUI card opens a window to the
 * WordPress admin, the user approves, and WordPress redirects back to a DSH
 * host route that completes the exchange and stores the grant.
 *
 * Flow:
 *   1. `/zeroy/connect/start?endpoint=X&label=Y` → create a PKCE intent on
 *      the WordPress side, redirect to the WP admin approval page.
 *   2. User (logged into WP) clicks Approve.
 *   3. WP redirects to `/zeroy/connect/callback?intent_id=..&code=..&state=..`.
 *   4. Callback verifies state, exchanges code+verifier for a grant, stores
 *      the grant in ctx.credentials and the site in settings, then renders a
 *      "binding complete" page that the card detects via a close event.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/pairing
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { upsertSite } from './settings.ts'
import type { Context } from '@deepseek-ai/cordis'

/** Route prefix owned by the zeroY browser binding flow. */
export const ZEROY_CONNECT_PREFIX = '/zeroy/connect'

/** A live binding attempt keyed by its OAuth state. */
interface BindingAttempt {
  readonly verifier: string
  readonly state: string
  readonly endpoint: string
  readonly label: string
  readonly siteId: string
  readonly credentialRef: string
  readonly intentId: string
  readonly createdAt: number
}

const ATTEMPT_TTL_MS = 10 * 60 * 1000 // 10 minutes, matching the WP intent expiry

/**
 * In-memory registry of binding attempts. Callback is same-process, so an
 * in-memory map suffices; a restart simply abandons uncompleted attempts.
 */
class BindingRegistry {
  private readonly attempts = new Map<string, BindingAttempt>()

  register(attempt: BindingAttempt): void {
    this.prune()
    this.attempts.set(attempt.state, attempt)
  }

  take(state: string): BindingAttempt | undefined {
    this.prune()
    const attempt = this.attempts.get(state)
    if (attempt === undefined) return undefined
    this.attempts.delete(state)
    return attempt
  }

  private prune(): void {
    const now = Date.now()
    for (const [state, attempt] of this.attempts) {
      if (now - attempt.createdAt > ATTEMPT_TTL_MS) this.attempts.delete(state)
    }
  }
}

const registry = new BindingRegistry()

/** The webserver's public base URL (host may be 0.0.0.0; advertise loopback). */
function webServerBase(webServer: { host: string; port: number }): string {
  const host = webServer.host === '0.0.0.0' || webServer.host === '::' ? '127.0.0.1' : webServer.host
  return `http://${host}:${webServer.port}`
}

/** Random hex token. */
const randomToken = (bytes = 32): string => randomBytes(bytes).toString('hex')

/** Derive a stable site id from an endpoint. */
function deriveSiteId(endpoint: string): string {
  try {
    return new URL(endpoint).hostname.replace(/[^a-z0-9.-]/g, '').slice(0, 60) || 'site'
  } catch {
    return 'site'
  }
}

/** Derive a credential ref from a label. */
function deriveCredentialRef(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'site'
  return `ZEROY_SITE_${slug.toUpperCase()}`
}

/** Parse a URL query string into a record. */
function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {}
  const q = search.includes('?') ? search.slice(search.indexOf('?')) : search.startsWith('?') ? search : `?${search}`
  const url = new URL(`http://local${q}`)
  for (const [key, value] of url.searchParams) out[key] = value
  return out
}

/** POST JSON to the WP Connector API. */
async function connectorPost(
  endpoint: string,
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${endpoint}/wp-json/zeroy/v1/${path}`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Connector returned invalid JSON: ${text.slice(0, 200)}`)
  }
  if (!response.ok) {
    const error = typeof parsed === 'object' && parsed !== null && 'error' in parsed
      ? (parsed as { error: { message?: string } }).error?.message
      : undefined
    throw new Error(error ?? `Connector rejected ${path} (${response.status})`)
  }
  return parsed as Record<string, unknown>
}

/** Write an HTML page (used for the callback completion screen). */
function writeHtml(res: ServerResponse, title: string, bodyHtml: string, closeSignal: string): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f7f9;color:#1f2328}
.card{background:#fff;border:1px solid #e4e6ea;border-radius:12px;padding:32px 40px;max-width:420px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}
h1{font-size:20px;margin:0 0 8px}
p{font-size:14px;color:#59636e;line-height:1.6;margin:8px 0}
.ok{color:#1a7f37}.err{color:#cf222e}
button{margin-top:16px;padding:8px 20px;border-radius:8px;border:0;background:#0969da;color:#fff;font-size:14px;cursor:pointer}
</style></head><body><div class="card"><h1>${title}</h1>${bodyHtml}
<button onclick="window.close()">Close</button></div>
<script>try{window.opener && window.opener.postMessage({__dshZeroYBinding:'${closeSignal}'},'*')}catch(e){}</script>
</body></html>`)
}

/**
 * Register the zeroY browser-binding routes on the host webserver.
 * @param ctx - plugin context carrying settings + credentials.
 */
export function registerPairingRoutes(ctx: Context): void {
  const webServer = ctx.get('webServer')
  if (webServer === undefined) {
    ctx.logger.info('tool-zeroy: no webServer service; browser-driven binding disabled')
    return
  }

  // ---- GET /zeroy/connect/start?endpoint=&label= ----
  // Create the PKCE intent on the WP side, then redirect to the WP admin
  // approval page. The user approves there; WP redirects to the callback.
  webServer.register({
    kind: 'exact',
    path: `${ZEROY_CONNECT_PREFIX}/start`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const query = parseQuery(req.url ?? '')
        const endpoint = (query.endpoint ?? '').replace(/\/+$/, '')
        const label = query.label ?? ''
        if (endpoint === '' || label === '') {
          writeHtml(res, 'Missing parameters', '<p class="err">Binding needs both a site URL and a label.</p>', 'failed')
          return
        }
        if (!/^https?:\/\//.test(endpoint) || !URL.canParse(endpoint)) {
          writeHtml(res, 'Invalid site URL', `<p class="err">${endpoint} is not a valid URL.</p>`, 'failed')
          return
        }

        const redirectUri = `${webServerBase(webServer)}${ZEROY_CONNECT_PREFIX}/callback`
        const verifier = randomToken(32)
        const codeChallenge = createHash('sha256').update(verifier, 'utf8').digest('hex')
        const state = randomToken()
        const clientId = 'dsh-local'

        const intent = await connectorPost(endpoint, 'connection/authorize', {
          client_id: clientId,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          state,
          label,
        })
        const intentId = typeof intent.intentId === 'string' ? intent.intentId : undefined
        if (intentId === undefined) {
          writeHtml(res, 'Pairing failed', '<p class="err">The site did not return a pairing intent. Is the zeroY plugin installed and active?</p>', 'failed')
          return
        }

        registry.register({
          verifier,
          state,
          endpoint,
          label,
          siteId: deriveSiteId(endpoint),
          credentialRef: deriveCredentialRef(label),
          intentId,
          createdAt: Date.now(),
        })

        // Redirect to the WP admin approval page, scoped to this intent.
        const adminPath = `${endpoint}/wp-admin/admin.php?page=zeroy-connections&intent_id=${encodeURIComponent(intentId)}`
        res.writeHead(302, { location: adminPath })
        res.end()
      } catch (error) {
        ctx.logger.warn('tool-zeroy: binding start failed: %s', String(error))
        writeHtml(res, 'Pairing failed', `<p class="err">${String(error)}</p>`, 'failed')
      }
    },
  })

  // ---- GET /zeroy/connect/callback?intent_id=&code=&state= ----
  // Verify state, exchange code+verifier for a grant, store it, and render
  // a completion page that tells the card to refresh.
  webServer.register({
    kind: 'exact',
    path: `${ZEROY_CONNECT_PREFIX}/callback`,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const query = parseQuery(req.url ?? '')
        const { intent_id: intentId, code, state } = query
        if (intentId === undefined || code === undefined || state === undefined) {
          writeHtml(res, 'Incomplete callback', '<p class="err">The approval callback was missing parameters.</p>', 'failed')
          return
        }
        const attempt = registry.take(state)
        if (attempt === undefined) {
          writeHtml(res, 'Pairing expired', '<p class="err">This binding attempt expired or was already used. Start again from the zeroY card.</p>', 'failed')
          return
        }

        const redirectUri = `${webServerBase(webServer)}${ZEROY_CONNECT_PREFIX}/callback`
        const exchange = await connectorPost(attempt.endpoint, 'connection/exchange', {
          intent_id: intentId,
          code,
          code_verifier: attempt.verifier,
          state,
          redirect_uri: redirectUri,
        })
        const grantSecret = typeof exchange.grantSecret === 'string' ? exchange.grantSecret : undefined
        if (grantSecret === undefined) {
          writeHtml(res, 'Pairing failed', '<p class="err">The site did not return a grant. The approval may have expired.</p>', 'failed')
          return
        }

        // Store the grant in credentials and the site in settings.
        const credentials = ctx.get('credentials')
        if (credentials !== undefined) {
          await credentials.set(credentialRef(attempt.credentialRef), grantSecret)
        }
        await upsertSite(ctx, {
          siteId: attempt.siteId,
          label: attempt.label,
          endpoint: attempt.endpoint,
          credentialRef: attempt.credentialRef,
        })

        writeHtml(
          res,
          'Site bound!',
          `<p class="ok">${attempt.label} is now connected to zeroY.</p><p>You can close this window and return to the zeroY card.</p>`,
          'paired',
        )
      } catch (error) {
        ctx.logger.warn('tool-zeroy: binding callback failed: %s', String(error))
        writeHtml(res, 'Pairing failed', `<p class="err">${String(error)}</p>`, 'failed')
      }
    },
  })
}
