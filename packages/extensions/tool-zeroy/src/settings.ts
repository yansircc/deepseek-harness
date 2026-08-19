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
}

export const ZeroYSitesSchema: z<ZeroYSitesSettings> = z.object({
  sites: z.array(z.object({
    siteId: z.string(),
    label: z.string(),
    endpoint: z.string(),
    credentialRef: z.string(),
  })).default([]),
})

/** Default composition entry: no sites configured. */
const DEFAULT_ENTRY: ZeroYSitesSettings = { sites: [] }

/** Live source thunk; replaced by `installSettingsSection` when a provider mounts. */
let currentSource: () => ZeroYSitesSettings = () => DEFAULT_ENTRY

/**
 * Register the `zeroy-sites` settings section. Call once during plugin apply().
 * The section falls back to the empty default when no settings provider is mounted.
 */
export function registerZeroYSitesSettings(ctx: Context): void {
  installSettingsSection(ctx, ZEROY_SITES_NAMESPACE, ZeroYSitesSchema, DEFAULT_ENTRY, {
    setSource: (current) => { currentSource = current },
    onChange: () => {},
  })
}

/** Read the current list of configured sites. */
export function getConfiguredSites(): ReadonlyArray<ZeroYSiteEntry> {
  return currentSource().sites
}

/** Find one site by its routing key. */
export function findSite(siteId: string): ZeroYSiteEntry | undefined {
  return getConfiguredSites().find(s => s.siteId === siteId)
}

/**
 * Add or update a site entry. Requires `ctx.settings` to be available.
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
