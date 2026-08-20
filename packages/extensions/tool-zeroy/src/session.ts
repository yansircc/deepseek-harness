/**
 * zeroY session: connection resolution, credential lookup, and per-site
 * mutation serialization.
 *
 * Unlike the Pi extension which owns a scoped `ActiveSession` with Effect-based
 * SynchronizedRefs, this DSH adapter resolves connections statelessly from two
 * sources on every tool call:
 *
 * 1. **DSH settings** (`zeroy-sites` namespace) — site metadata (siteId, label,
 *    endpoint, credentialRef).
 * 2. **DSH credentials** (`ctx.credentials`) — grant secrets resolved by
 *    credentialRef at call time, so rotated secrets take effect without restart.
 *
 * The mutation gate serializes writes per site using a simple Promise chain,
 * replacing the Pi `Semaphore.withPermits(1)` pattern.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/session
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SiteConnection } from './domain/connection.ts'
import { loadSiteConnections } from './domain/connection.ts'
import { findSite, getConfiguredSites } from './settings.ts'

// ---------------------------------------------------------------------------
// Resolved connection: metadata + live credential
// ---------------------------------------------------------------------------

/** A fully resolved connection ready for Connector API calls. */
export interface ResolvedConnection extends SiteConnection {
  /** The grant secret for Bearer authentication, resolved at call time. */
  readonly grantSecret: string
}

/** Thrown when a site is not configured or its credential is missing. */
export class ZeroYConnectionError extends Error {
  /** Stable failure code distinguishing unknown site, missing credential, or invalid ref. */
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ZeroYConnectionError'
    this.code = code
  }
}

/** Cache for env-based connections so we don't re-parse on every call. */
let envConnections: ReadonlyArray<SiteConnection> | undefined

async function getEnvConnections(): Promise<ReadonlyArray<SiteConnection>> {
  if (envConnections !== undefined) return envConnections
  envConnections = await loadSiteConnections()
  return envConnections
}

/**
 * Resolve one site's connection metadata and grant secret.
 *
 * @param ctx - the cordis context carrying `credentials`.
 * @param siteId - the routing key from the tool input.
 * @returns the resolved connection with a live grant secret.
 * @throws {ZeroYConnectionError} when the site is unknown or its credential is unconfigured.
 */
export async function resolveConnection(ctx: Context, siteId: string): Promise<ResolvedConnection> {
  // First try settings-backed sites
  const entry = findSite(siteId)

  // Fallback to ZEROY_SITES environment variable (headless/CI mode)
  if (entry === undefined) {
    const envSites = await getEnvConnections()
    const envEntry = envSites.find(s => s.siteId === siteId)
    if (envEntry !== undefined) {
      // For env-based connections, use connectionKey as the grant secret
      const connectionKey = (envEntry as unknown as { connectionKey?: string | null }).connectionKey ?? null
      if (connectionKey) {
        return {
          ...envEntry,
          grantSecret: connectionKey,
        }
      }
    }
  }

  if (entry === undefined) {
    const configured = [...getConfiguredSites().map(s => s.siteId)]
    const envSites = await getEnvConnections()
    configured.push(...envSites.map(s => s.siteId))
    throw new ZeroYConnectionError(
      'ZEROY_SITE_UNKNOWN',
      configured.length > 0
        ? `Unknown zeroY site "${siteId}". Configured sites: ${configured.join(', ')}`
        : 'No zeroY sites configured. Use zeroy_pair to bind a site or set ZEROY_SITES.',
    )
  }

  const credentials = ctx.get('credentials')
  if (credentials === undefined) {
    throw new ZeroYConnectionError(
      'ZEROY_CREDENTIALS_UNAVAILABLE',
      'The credentials service is not available. Load @deepseek-ai/dsh-credentials-local.',
    )
  }

  let ref: CredentialRef
  try {
    ref = credentialRef(entry.credentialRef)
  } catch {
    throw new ZeroYConnectionError(
      'ZEROY_CREDENTIAL_REF_INVALID',
      `Site "${siteId}" has an invalid credentialRef: "${entry.credentialRef}".`,
    )
  }

  const resolved = await credentials.resolve(ref)
  if (resolved === undefined) {
    throw new ZeroYConnectionError(
      'ZEROY_CREDENTIAL_MISSING',
      `Credential "${entry.credentialRef}" for site "${siteId}" is not configured. `
      + 'Set it via the Models page, .credentials.yaml, or environment variable.',
    )
  }

  return {
    siteId: entry.siteId,
    label: entry.label,
    endpoint: entry.endpoint,
    grant: null,
    connectionKey: null,
    revoked: false,
    grantSecret: resolved.value,
  }
}

// ---------------------------------------------------------------------------
// Per-site mutation gate
// ---------------------------------------------------------------------------

/**
 * Serializes write operations per site so concurrent pushes to the same site
 * cannot interleave. Read operations are unrestricted.
 *
 * Replaces the Pi `SynchronizedRef<Map<string, Semaphore>>` with a plain
 * Promise chain per site. Each queued operation waits for the previous one
 * to settle (success or failure) before starting.
 */
export class SiteMutationGate {
  private queues = new Map<string, Promise<void>>()

  /**
   * Run `fn` exclusively for `siteId`. Concurrent callers for the same site
   * queue behind each other; callers for different sites run in parallel.
   * @param siteId - site whose writes this call serializes against.
   * @param fn - exclusive work to run after prior writes for this site settle.
   * @returns the value `fn` resolves to.
   */
  async withGate<T>(siteId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(siteId) ?? Promise.resolve()
    let result!: T
    const next = prev.then(async () => {
      result = await fn()
    }, async () => {
      // Previous failed; still run this operation.
      result = await fn()
    })
    this.queues.set(siteId, next.catch(() => {})) // swallow for the chain
    await next
    return result
  }
}

/** Singleton gate shared across all tool invocations within one agent session. */
let globalGate: SiteMutationGate | undefined

/**
 * Get or create the process-wide mutation gate.
 * @returns the shared gate used by all tool invocations in this process.
 */
export function getMutationGate(): SiteMutationGate {
  if (globalGate === undefined) globalGate = new SiteMutationGate()
  return globalGate
}
