/**
 * zeroY site metadata persistence via DSH settings.
 *
 * Stores the list of configured sites (siteId, label, endpoint, credentialRef)
 * under the `zeroy-sites` namespace. Secrets live in `ctx.credentials`; this
 * module owns only the non-secret metadata that tools need to enumerate and
 * route requests.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/settings
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

/** Settings namespace key for configured site metadata and pending bindings. */
export const ZEROY_SITES_NAMESPACE = settingsNamespace('zeroy-sites')

/** One configured zeroY site's non-secret metadata. */
export interface ZeroYSiteEntry {
  /** Stable site identifier used as the routing key in every tool call. */
  readonly siteId: string
  /** Human-readable label for display. */
  readonly label: string
  /** WordPress site base URL (no trailing slash). */
  readonly endpoint: string
  /** CredentialRef pointing to the grant secret in `ctx.credentials`. */
  readonly credentialRef: string
}

/** Shape of the `zeroy-sites` settings section. */
export interface ZeroYSitesSettings {
  sites: ZeroYSiteEntry[]
  /**
   * One pending browser-driven binding request, written by the WebUI card
   * and consumed by the host pairing handler. Cleared once the request is
   * answered (paired or failed).
   */
  pendingBindings?: ZeroYPendingBinding[]
}

/** A browser-initiated binding request awaiting host processing. */
export interface ZeroYPendingBinding {
  /** Client-generated request id (echoed back so the card can correlate). */
  readonly requestId: string
  /** WordPress site base URL. */
  readonly endpoint: string
  /** Human-readable label. */
  readonly label: string
  /** PKCE code challenge (SHA-256 of the verifier) — host verifies on exchange. */
  readonly codeChallenge: string
  /** OAuth state, echoed back on the callback. */
  readonly state: string
  /** When the request was written (ms epoch), for expiry. */
  readonly createdAt: number
  /** Updated by the host as the flow progresses. */
  readonly status: 'pending' | 'awaiting-approval' | 'paired' | 'failed'
  /** The WP admin approval URL the card should open, once the host created the intent. */
  readonly approvalUrl?: string
  /** Failure message when status is 'failed'. */
  readonly error?: string
}

/** Schemastery schema that validates and defaults the `zeroy-sites` settings document. */
export const ZeroYSitesSchema: z<ZeroYSitesSettings> = z.object({
  sites: z.array(z.object({
    siteId: z.string(),
    label: z.string(),
    endpoint: z.string(),
    credentialRef: z.string(),
  })).default([]),
  pendingBindings: z.array(z.object({
    requestId: z.string(),
    endpoint: z.string(),
    label: z.string(),
    codeChallenge: z.string(),
    state: z.string(),
    createdAt: z.number(),
    status: z.union([
      'pending',
      'awaiting-approval',
      'paired',
      'failed',
    ]),
    approvalUrl: z.string(),
    error: z.string(),
  })).default([]),
})

/** Default composition entry: no sites configured. */
const DEFAULT_ENTRY: ZeroYSitesSettings = { sites: [] }

/** Live source thunk; replaced by `installSettingsSection` when a provider mounts. */
let currentSource: () => ZeroYSitesSettings = () => DEFAULT_ENTRY

/**
 * Register the `zeroy-sites` settings section. Call once during plugin apply().
 * The section falls back to the empty default when no settings provider is mounted.
 * @param ctx - plugin context that owns the settings registry.
 */
export function registerZeroYSitesSettings(ctx: Context): void {
  installSettingsSection(ctx, ZEROY_SITES_NAMESPACE, ZeroYSitesSchema, DEFAULT_ENTRY, {
    setSource: (current) => { currentSource = current },
    onChange: () => {},
  })
}

/**
 * Read the current list of configured sites.
 * @returns live snapshot of configured site metadata; empty when none are stored.
 */
export function getConfiguredSites(): ReadonlyArray<ZeroYSiteEntry> {
  return currentSource().sites
}

/**
 * Find one site by its routing key.
 * @param siteId - routing key used in tool calls.
 * @returns matching site metadata, or undefined when no site uses that key.
 */
export function findSite(siteId: string): ZeroYSiteEntry | undefined {
  return getConfiguredSites().find(s => s.siteId === siteId)
}

/**
 * Add or update a site entry. Requires `ctx.settings` to be available.
 * @param ctx - plugin context used to persist the settings document.
 * @param entry - site metadata to insert or replace by `siteId`.
 * @returns true if the write succeeded, false if no settings provider is mounted.
 */
export async function upsertSite(ctx: Context, entry: ZeroYSiteEntry): Promise<boolean> {
  const settings = ctx.get('settings')
  if (settings === undefined) return false
  const current = currentSource()
  const existing = current.sites.findIndex(s => s.siteId === entry.siteId)
  const next = [...current.sites]
  if (existing >= 0) {
    next[existing] = entry
  } else {
    next.push(entry)
  }
  await settings.update(ZEROY_SITES_NAMESPACE, { sites: next })
  return true
}

/**
 * Remove a site entry by siteId. Requires `ctx.settings` to be available.
 * @param ctx - plugin context used to persist the settings document.
 * @param siteId - routing key of the site to drop.
 * @returns true if the write succeeded, false if no settings provider is mounted.
 */
export async function removeSite(ctx: Context, siteId: string): Promise<boolean> {
  const settings = ctx.get('settings')
  if (settings === undefined) return false
  const current = currentSource()
  const next = current.sites.filter(s => s.siteId !== siteId)
  await settings.update(ZEROY_SITES_NAMESPACE, { sites: next })
  return true
}

// ---------------------------------------------------------------------------
// Pending browser-driven bindings
// ---------------------------------------------------------------------------

/**
 * Read the current pending binding requests.
 * @returns live snapshot of pending bindings; empty when the field is absent.
 */
export function getPendingBindings(): ReadonlyArray<ZeroYPendingBinding> {
  return currentSource().pendingBindings ?? []
}

/**
 * Update the pending-bindings list, preserving sites. The settings document
 * is replaced wholesale, so callers pass the full updated binding list.
 * @param ctx - plugin context used to persist the settings document.
 * @param bindings - complete pending-binding list to store.
 * @returns true when the write succeeded.
 */
export async function writePendingBindings(
  ctx: Context,
  bindings: ReadonlyArray<ZeroYPendingBinding>,
): Promise<boolean> {
  const settings = ctx.get('settings')
  if (settings === undefined) return false
  await settings.update(ZEROY_SITES_NAMESPACE, {
    pendingBindings: [...bindings],
  })
  return true
}
