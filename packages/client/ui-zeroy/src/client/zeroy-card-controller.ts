/**
 * The zeroY card's controller: binds the `zeroy-sites` settings scope and
 * exposes the sites list plus one-click browser binding. The binding flow is
 * OAuth-driven: the card opens /zeroy/connect/start, the user approves in
 * WordPress, and the host callback stores the grant. The card detects
 * completion via a postMessage signal and the settings snapshot refresh.
 */

import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** Namespace of the zeroY sites section. Spelled here: a client package must
 * not depend on a Host package. */
export const ZEROY_NS = 'zeroy-sites'

/** One configured site as the card renders it. */
export interface ZeroYSite {
  readonly siteId: string
  readonly label: string
  readonly endpoint: string
  readonly credentialRef: string
}

/** The `zeroy-sites` section value. */
export interface ZeroYSitesSettings {
  sites: ZeroYSite[]
}

/** What the zeroY card renders. */
export interface ZeroYCardState {
  /** Whether the namespace is served and the card can render. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** The configured sites. */
  sites: readonly ZeroYSite[]
  /** The bind-site draft. */
  draft: { endpoint: string }
  /** Whether a binding window is open and awaiting approval. */
  binding: boolean
  /** Whether the last bind attempt failed. */
  bindFailed: boolean
  /** Error message from the last failure. */
  bindError: string
}

/** Actions the card dispatches. */
export interface ZeroYCardActions {
  /** Update the bind-site URL field. */
  editDraft: (field: 'endpoint', text: string) => void
  /** Open the browser binding flow for the drafted site. */
  beginBind: () => void
  /** Remove one site by its id. */
  removeSite: (siteId: string) => void
  /** Handle the postMessage completion signal from the callback page. */
  handleBindSignal: (signal: string) => void
}

/** The registration-side face the card's slot entry injects. */
export interface ZeroYCardFace extends ZeroYCardActions {
  hooks: {
    zeroYCard: SnapshotStore<ZeroYCardState>
  }
}

/** postMessage signal the host callback page sends on completion. */
const BIND_SIGNAL_PREFIX = '__dshZeroYBinding:'

const normalizeEndpoint = (value: string): string => value.trim().replace(/\/+$/, '')

export class ZeroYCardController {
  private readonly store: SnapshotStore<ZeroYCardState>
  private draft: { endpoint: string } = { endpoint: '' }
  private binding = false
  private bindFailed = false
  private bindError = ''

  /** @param scope - the bound settings scope for the `zeroy-sites` namespace. */
  constructor(private readonly scope: SettingsScope<ZeroYSitesSettings>) {
    this.store = createSnapshotStore(this.projection())
    scope.subscribe(() => { this.publish() })
  }

  private projection(): ZeroYCardState {
    const snapshot = this.scope.getSnapshot()
    const sites = (snapshot.value?.sites ?? []) as readonly ZeroYSite[]
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      sites,
      draft: this.draft,
      binding: this.binding,
      bindFailed: this.bindFailed,
      bindError: this.bindError,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  actions(): ZeroYCardFace {
    return {
      hooks: { zeroYCard: this.store },
      editDraft: (field, text) => {
        this.draft = { ...this.draft, [field]: text }
        this.bindFailed = false
        this.bindError = ''
        this.publish()
      },
      beginBind: () => {
        const endpoint = normalizeEndpoint(this.draft.endpoint)
        if (endpoint === '') return
        const params = new URLSearchParams({ endpoint })
        const url = `/zeroy/connect/start?${params.toString()}`
        this.binding = true
        this.bindFailed = false
        this.bindError = ''
        this.publish()
        // Open the WordPress approval window. The user approves there; the
        // host callback page postMessages back and the settings snapshot
        // refreshes to include the new site.
        try {
          window.open(url, '_blank', 'noopener,noreferrer')
        } catch {
          // Popup blockers may return null; fall back to a top-level open.
          window.location.href = url
        }
        // Clear the in-progress flag after a generous window so the user can
        // retry if the popup was blocked or they navigated away.
        window.setTimeout(() => {
          this.binding = false
          this.publish()
        }, 60_000)
      },
      removeSite: (siteId) => {
        const next = this.value().sites.filter(s => s.siteId !== siteId)
        void this.writeSites(next)
      },
      handleBindSignal: (signal) => {
        this.binding = false
        if (signal === 'paired') {
          this.draft = { endpoint: '' }
        } else {
          this.bindFailed = true
          this.bindError = 'The binding was not completed.'
        }
        this.publish()
      },
    }
  }

  private value(): ZeroYSitesSettings {
    return this.scope.getSnapshot().value ?? { sites: [] }
  }

  private async writeSites(next: ZeroYSite[]): Promise<void> {
    await this.scope.set('sites', next)
  }
}

/** Install the postMessage listener for the binding completion signal. */
export function installBindSignalListener(
  handle: (signal: string) => void,
): () => void {
  const listener = (event: MessageEvent): void => {
    const data = event.data
    if (typeof data !== 'string' || !data.startsWith(BIND_SIGNAL_PREFIX)) return
    handle(data.slice(BIND_SIGNAL_PREFIX.length))
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}
