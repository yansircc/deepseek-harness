/**
 * The zeroY card's controller: binds the `zeroy-sites` settings scope and
 * exposes the sites list plus add/remove actions. Reads are reactive through
 * the scope snapshot; writes go through the scope's durable set().
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
  /** The add-site draft. */
  draft: { label: string; endpoint: string; credentialRef: string }
  /** Whether an add is crossing the wire. */
  adding: boolean
  /** Whether the last add failed. */
  addFailed: boolean
}

/** Actions the card dispatches. */
export interface ZeroYCardActions {
  /** Update one add-site draft field. */
  editDraft: (field: 'label' | 'endpoint' | 'credentialRef', text: string) => void
  /** Add the site described by the draft. */
  addSite: () => void
  /** Remove one site by its id. */
  removeSite: (siteId: string) => void
}

/** The registration-side face the card's slot entry injects. */
export interface ZeroYCardFace extends ZeroYCardActions {
  hooks: {
    zeroYCard: SnapshotStore<ZeroYCardState>
  }
}

const normalizeEndpoint = (value: string): string => value.trim().replace(/\/+$/, '')

const normalizeLabel = (value: string): string => value.trim()

const siteIdOf = (endpoint: string): string => {
  try {
    return new URL(endpoint).hostname.replace(/[^a-z0-9.-]/g, '').slice(0, 60) || 'site'
  } catch {
    return 'site'
  }
}

export class ZeroYCardController {
  private readonly store: SnapshotStore<ZeroYCardState>
  private draft: { label: string; endpoint: string; credentialRef: string } = {
    label: '',
    endpoint: '',
    credentialRef: '',
  }
  private adding = false
  private addFailed = false

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
      adding: this.adding,
      addFailed: this.addFailed,
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  private snapshotValue(): ZeroYSitesSettings {
    return this.scope.getSnapshot().value ?? { sites: [] }
  }

  private async writeSites(next: ZeroYSite[]): Promise<void> {
    await this.scope.set('sites', next)
  }

  actions(): ZeroYCardFace {
    return {
      hooks: { zeroYCard: this.store },
      editDraft: (field, text) => {
        this.draft = { ...this.draft, [field]: text }
        this.addFailed = false
        this.publish()
      },
      addSite: () => {
        const label = normalizeLabel(this.draft.label)
        const endpoint = normalizeEndpoint(this.draft.endpoint)
        const credentialRef = this.draft.credentialRef.trim()
        if (label === '' || endpoint === '' || credentialRef === '') return
        const existing = this.snapshotValue().sites
        const siteId = siteIdOf(endpoint)
        const next = [...existing.filter(s => s.siteId !== siteId)]
        next.push({ siteId, label, endpoint, credentialRef })
        this.adding = true
        this.publish()
        void this.writeSites(next).then(
          () => {
            this.adding = false
            this.draft = { label: '', endpoint: '', credentialRef: '' }
            this.publish()
          },
          () => {
            this.adding = false
            this.addFailed = true
            this.publish()
          },
        )
      },
      removeSite: (siteId) => {
        const next = this.snapshotValue().sites.filter(s => s.siteId !== siteId)
        void this.writeSites(next)
      },
    }
  }
}
