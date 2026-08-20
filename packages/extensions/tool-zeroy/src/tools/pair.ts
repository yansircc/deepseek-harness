/**
 * `zeroy_pair` and `zeroy_unpair` tools: bind and unbind WordPress sites.
 *
 * Pairing is a two-step flow:
 * 1. First call with `{ endpoint, label }` → creates a pairing intent on the
 *    WP side and returns an `intentId`. The agent tells the user to create a
 *    pairing code in the WP admin.
 * 2. Second call with `{ endpoint, label, intentId, code }` → exchanges the
 *    code for a grant secret, stores it in `ctx.credentials`, and adds the
 *    site metadata to DSH settings.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/tools/pair
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { upsertSite, removeSite, findSite, getConfiguredSites } from '../settings.ts'
import { resolveConnection } from '../session.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a stable credential ref from a site label or endpoint. */
function deriveCredentialRef(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'site'
  return `ZEROY_SITE_${slug.toUpperCase()}`
}

/** Derive a stable siteId from an endpoint URL. */
function deriveSiteId(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    return url.hostname.replace(/[^a-z0-9.-]/g, '').slice(0, 60) || 'site'
  } catch {
    return 'site'
  }
}

/** POST to the WP Connector API during pairing (no auth needed for authorize/exchange). */
async function connectorPostUnauthenticated(
  endpoint: string,
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const url = `${endpoint}/wp-json/zeroy/v1/${path}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal !== undefined ? { signal } : {}),
  })
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Connector returned invalid JSON: ${text.slice(0, 300)}`)
  }
  if (!response.ok) {
    const error = typeof parsed === 'object' && parsed !== null && 'error' in parsed
      ? (parsed as { error: { message?: string } }).error?.message
      : undefined
    throw new Error(error ?? `Connector rejected pairing request (${response.status})`)
  }
  return parsed as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// zeroy_pair tool
// ---------------------------------------------------------------------------

/**
 * Register `zeroy_pair` on the tool registry. Step 1 creates a WordPress pairing
 * intent; step 2 exchanges the admin code for a grant, stores it in credentials,
 * and persists site metadata. The grant secret never appears in the tool result.
 * @param ctx - plugin context that owns tools, credentials, and settings.
 */
export function registerPairTool(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'zeroy_pair',
    description:
      'Bind a WordPress site to zeroY. Two-step flow: '
      + '(1) call with endpoint+label to get an intentId, then ask the user to create a pairing code in WP admin; '
      + '(2) call again with endpoint+label+intentId+code to complete the binding. '
      + 'The grant secret is stored securely and never exposed to the model.',
    parameters: {
      endpoint: {
        type: 'string',
        required: true,
        description: 'WordPress site base URL (e.g. https://example.com).',
      },
      label: {
        type: 'string',
        required: true,
        description: 'Human-readable label for this site.',
      },
      intentId: {
        type: 'string',
        description: 'Pairing intent ID from step 1. Required for step 2.',
      },
      code: {
        type: 'string',
        description: 'Pairing code from WP admin. Required for step 2.',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const endpoint = String(args.endpoint).replace(/\/+$/, '')
      const label = String(args.label)
      const intentId = args.intentId !== undefined ? String(args.intentId) : undefined
      const code = args.code !== undefined ? String(args.code) : undefined

      // Step 2: exchange code for grant
      if (intentId !== undefined && code !== undefined) {
        const credentials = ctx.get('credentials')
        if (credentials === undefined) {
          throw new Error('Credentials service unavailable. Load @deepseek-ai/dsh-credentials-local.')
        }

        const exchangeResult = await connectorPostUnauthenticated(
          endpoint,
          'connection/exchange',
          { intentId, code },
          exec.signal,
        )

        const grantSecret = typeof exchangeResult.grantSecret === 'string'
          ? exchangeResult.grantSecret
          : undefined
        if (grantSecret === undefined) {
          throw new Error('Connector did not return a grantSecret in the exchange response.')
        }

        const siteId = deriveSiteId(endpoint)
        const credRef = deriveCredentialRef(label)

        // Store the grant secret
        const ref = credentialRef(credRef)
        await credentials.set(ref, grantSecret)

        // Store site metadata
        const stored = await upsertSite(ctx, {
          siteId,
          label,
          endpoint,
          credentialRef: credRef,
        })
        if (!stored) {
          throw new Error('Settings service unavailable. Cannot persist site metadata.')
        }

        return {
          status: 'paired',
          siteId,
          label,
          endpoint,
          credentialRef: credRef,
        }
      }

      // Step 1: create pairing intent
      const authorizeResult = await connectorPostUnauthenticated(
        endpoint,
        'connection/authorize',
        { clientId: label, clientLabel: label },
        exec.signal,
      )

      const returnedIntentId = typeof authorizeResult.intentId === 'string'
        ? authorizeResult.intentId
        : undefined
      if (returnedIntentId === undefined) {
        throw new Error('Connector did not return an intentId. Check the site URL and plugin installation.')
      }

      return {
        status: 'awaiting_code',
        intentId: returnedIntentId,
        endpoint,
        label,
        instructions:
          'Go to your WordPress admin → zeroY Connections page and click "Create pairing code". '
          + `Then call zeroy_pair again with endpoint="${endpoint}", label="${label}", `
          + `intentId="${returnedIntentId}", and the pairing code.`,
      }
    },
  }))
}

// ---------------------------------------------------------------------------
// zeroy_unpair tool
// ---------------------------------------------------------------------------

/**
 * Register `zeroy_unpair` on the tool registry. Revokes the WordPress grant
 * when reachable, then drops the stored credential and site metadata even if
 * the remote revoke fails.
 * @param ctx - plugin context that owns tools, credentials, and settings.
 */
export function registerUnpairTool(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'zeroy_unpair',
    description:
      'Unbind a zeroY WordPress site. Revokes the grant on the WP side, '
      + 'removes the credential from secure storage, and removes the site metadata.',
    parameters: {
      siteId: {
        type: 'string',
        required: true,
        description: 'The site identifier to unbind.',
      },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const siteId = String(args.siteId)
      const entry = findSite(siteId)
      if (entry === undefined) {
        const configured = getConfiguredSites().map(s => s.siteId)
        throw new Error(
          configured.length > 0
            ? `Unknown site "${siteId}". Configured: ${configured.join(', ')}`
            : 'No sites configured.',
        )
      }

      // Try to revoke on the WP side (best-effort)
      try {
        const connection = await resolveConnection(ctx, siteId)
        await fetch(`${entry.endpoint}/wp-json/zeroy/v1/connection/authorize`, {
          method: 'DELETE',
          headers: {
            'accept': 'application/json',
            'authorization': `Bearer ${connection.grantSecret}`,
          },
          body: JSON.stringify({}),
          ...(exec.signal !== undefined ? { signal: exec.signal } : {}),
        })
      } catch {
        // Best-effort: the WP side may be unreachable
      }

      // Remove credential
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) {
        try {
          const ref = credentialRef(entry.credentialRef)
          await credentials.unset(ref)
        } catch {
          // Credential may already be gone
        }
      }

      // Remove site metadata
      await removeSite(ctx, siteId)

      return { status: 'unpaired', siteId }
    },
  }))
}
