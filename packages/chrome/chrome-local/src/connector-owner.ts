/** Transactional single-slot connector ownership. */
import { timingSafeEqual } from 'node:crypto'
import type { ChromeConnectorId } from '@deepseek-ai/dsh-chrome-protocol'
import type { ProfileConnector, PublicConnector } from './types.ts'

const secretEqual = (expected: string, actual: string): boolean => {
  const left = Buffer.from(expected, 'hex')
  const right = Buffer.from(actual, 'hex')
  return left.byteLength === right.byteLength && timingSafeEqual(left, right)
}

/** One authenticated connector slot; failed proofs never replace the current owner. */
export class ConnectorOwner {
  private current: ProfileConnector | undefined
  private lastSeenAt: number | undefined

  /** Commit a connector only after its HMAC secret has been proven. */
  adoptAfterProof(presented: ProfileConnector, proofSecret: string): ChromeConnectorId | undefined {
    if (!secretEqual(presented.secret, proofSecret)) throw new Error('connector did not prove secret possession')
    const evicted = this.current?.connectorId === presented.connectorId ? undefined : this.current?.connectorId
    this.current = presented
    this.lastSeenAt = undefined
    return evicted
  }

  /** Resolve an authenticated route identity. */
  authorize(connectorId: ChromeConnectorId): ProfileConnector | undefined {
    return this.current?.connectorId === connectorId ? this.current : undefined
  }

  /** Record a successful authenticated poll or result. */
  touch(connectorId: ChromeConnectorId, now: number): void {
    if (this.current?.connectorId === connectorId) this.lastSeenAt = now
  }

  /** Current public identity and lease timestamp. */
  status(): { readonly connector?: PublicConnector; readonly lastSeenAt?: number } {
    if (!this.current) return {}
    const { secret: _secret, ...connector } = this.current
    return { connector, ...(this.lastSeenAt === undefined ? {} : { lastSeenAt: this.lastSeenAt }) }
  }
}
