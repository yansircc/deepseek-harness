/**
 * The Chrome card's controller: binds the `tool-chrome` settings scope and
 * exposes the port / credential-ref form. Reads are reactive through the scope
 * snapshot; writes go through the scope's durable set()/unset().
 */

import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** Namespace of the Chrome bridge settings. Spelled here: a client package
 * must not depend on a Host package. */
export const CHROME_NS = 'tool-chrome'

/** The `tool-chrome` section value. */
export interface ChromeSettings {
  port?: number
  ownerCredentialRef?: string
}

/** One form field as the card renders it. */
export interface ChromeFieldState {
  /** Draft text the control renders. */
  text: string
  /** Whether a save would leave a user-layer override. */
  overridden: boolean
  /** Whether the draft is not accepted (blocks the save). */
  invalid: boolean
}

/** What the Chrome card renders. */
export interface ChromeCardState {
  /** Whether the namespace is served and the card can render. */
  available: boolean
  /** Whether the Host document accepts writes. */
  writable: boolean
  /** Whether the form holds edits a save would write. */
  dirty: boolean
  /** Whether any staged draft is invalid. */
  invalid: boolean
  /** Whether a save is crossing the wire. */
  saving: boolean
  /** Whether the last save did not land. */
  failed: boolean
  /** Port field. */
  port: ChromeFieldState
  /** Credential reference field. */
  ownerCredentialRef: ChromeFieldState
}

/** Actions the card dispatches. */
export interface ChromeCardActions {
  /** Stage draft text for one field. */
  edit: (field: 'port' | 'ownerCredentialRef', text: string) => void
  /** Stage a clear for one field. */
  resetField: (field: 'port' | 'ownerCredentialRef') => void
  /** Write every staged edit. */
  save: () => void
  /** Drop every staged edit. */
  discard: () => void
}

/** The registration-side face the card's slot entry injects. */
export interface ChromeCardFace extends ChromeCardActions {
  hooks: {
    chromeCard: SnapshotStore<ChromeCardState>
  }
}

/** A staged edit for one field. */
interface StagedEdit {
  text: string
  clear: boolean
}

const parsePort = (text: string): number | undefined => {
  const trimmed = text.trim()
  if (trimmed === '') return undefined // clear
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : undefined
}

export class ChromeCardController {
  private readonly store: SnapshotStore<ChromeCardState>
  private readonly staged = new Map<string, StagedEdit>()
  private saving = false
  private failed = false

  /** @param scope - the bound settings scope for the `tool-chrome` namespace. */
  constructor(private readonly scope: SettingsScope<ChromeSettings>) {
    this.store = createSnapshotStore(this.projection())
    scope.subscribe(() => { this.publish() })
  }

  private value(): ChromeSettings {
    return this.scope.getSnapshot().value ?? {}
  }

  private userLayer(): ChromeSettings | undefined {
    return this.scope.getSnapshot().user as ChromeSettings | undefined
  }

  private projection(): ChromeCardState {
    const snapshot = this.scope.getSnapshot()
    const stagedPort = this.staged.get('port')
    const stagedRef = this.staged.get('ownerCredentialRef')
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: this.staged.size > 0 && !this.saving,
      invalid: this.plan().some(item => item.run === undefined),
      saving: this.saving,
      failed: this.failed,
      port: this.field('port', stagedPort, this.value().port),
      ownerCredentialRef: this.field('ownerCredentialRef', stagedRef, this.value().ownerCredentialRef),
    }
  }

  private field(
    name: 'port' | 'ownerCredentialRef',
    staged: StagedEdit | undefined,
    stored: number | string | undefined,
  ): ChromeFieldState {
    if (staged === undefined) {
      return {
        text: name === 'port'
          ? (typeof stored === 'number' ? String(stored) : '')
          : (typeof stored === 'string' ? stored : ''),
        overridden: this.userLayer()?.[name] !== undefined,
        invalid: false,
      }
    }
    if (staged.clear) return { text: staged.text, overridden: false, invalid: false }
    const parsed = name === 'port' ? parsePort(staged.text) : (staged.text.trim() === '' ? undefined : staged.text.trim())
    return {
      text: staged.text,
      overridden: parsed !== undefined,
      invalid: parsed === undefined,
    }
  }

  /** Every staged edit a save would write. */
  private plan(): Array<{ field: string; run: (() => Promise<boolean>) | undefined }> {
    const plan: Array<{ field: string; run: (() => Promise<boolean>) | undefined }> = []
    for (const [field, staged] of this.staged) {
      if (staged.clear) {
        plan.push({ field, run: () => this.clear(field) })
        continue
      }
      if (field === 'port') {
        const parsed = parsePort(staged.text)
        if (parsed === undefined) plan.push({ field, run: undefined })
        else plan.push({ field, run: () => this.storePort(parsed) })
      } else {
        const trimmed = staged.text.trim()
        if (trimmed === '') plan.push({ field, run: () => this.clear(field) })
        else plan.push({ field, run: () => this.storeRef(trimmed) })
      }
    }
    return plan
  }

  private async clear(field: string): Promise<boolean> {
    await this.scope.unset(field)
    const user = this.userLayer()
    return user === undefined || user[field as keyof ChromeSettings] === undefined
  }

  private async storePort(port: number): Promise<boolean> {
    await this.scope.set('port', port)
    const v = this.value().port
    return v === port
  }

  private async storeRef(ref: string): Promise<boolean> {
    await this.scope.set('ownerCredentialRef', ref)
    const v = this.value().ownerCredentialRef
    return v === ref
  }

  private publish(): void {
    this.store.set(this.projection())
  }

  private async doSave(): Promise<void> {
    const plan = this.plan()
    const writes = plan.flatMap(item => item.run === undefined ? [] : [item.run])
    if (plan.length === 0 || this.saving || writes.length !== plan.length) return
    this.saving = true
    this.failed = false
    this.publish()
    let landed = true
    for (const write of writes) {
      landed = await write() && landed
    }
    if (landed) this.staged.clear()
    this.saving = false
    this.failed = !landed
    this.publish()
  }

  actions(): ChromeCardFace {
    return {
      hooks: { chromeCard: this.store },
      edit: (field, text) => {
        this.staged.set(field, { text, clear: false })
        this.failed = false
        this.publish()
      },
      resetField: (field) => {
        this.staged.set(field, { text: '', clear: true })
        this.failed = false
        this.publish()
      },
      save: () => { void this.doSave() },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return
        this.staged.clear()
        this.failed = false
        this.publish()
      },
    }
  }
}
