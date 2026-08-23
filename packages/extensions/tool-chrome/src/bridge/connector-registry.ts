/**
 * Single-slot registry of Chrome extension connectors presented to one bridge.
 *
 * A later handshake with a different `connectorId` replaces the previous
 * identity. Status and owner commands must use the live lease, not insertion
 * order: the first adopted id can remain after a reload while a newer id is
 * the one actually polling.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/connector-registry
 */

import type { ProfileConnector } from '../protocol/schema.ts'

/**
 * Adopted connector identities for one local bridge.
 */
export class ConnectorOwner {
  private readonly connectors = new Map<string, ProfileConnector>()

  /**
   * Adopt a presented connector identity and evict every other id.
   * Re-handshaking the same `connectorId` updates the record and evicts nothing.
   * @param presented - identity the extension just proved.
   * @returns connector ids removed to keep a single bound slot.
   */
  adopt(presented: ProfileConnector): string[] {
    const evicted: string[] = []
    for (const id of this.connectors.keys()) {
      if (id === presented.connectorId) continue
      evicted.push(id)
      this.connectors.delete(id)
    }
    this.connectors.set(presented.connectorId, presented)
    return evicted
  }

  /**
   * Look up one adopted identity by connector id.
   * @param connectorId - mailbox key the connector sends on later routes.
   * @returns the adopted record, or `undefined` when that id is not bound.
   */
  authorizedConnector(connectorId: string): ProfileConnector | undefined {
    return this.connectors.get(connectorId)
  }

  /**
   * Adopted identities in insertion order.
   * @returns a snapshot array; the live command target is {@link liveConnector}.
   */
  list(): ProfileConnector[] {
    return [...this.connectors.values()]
  }
}

/**
 * First adopted profile whose mailbox currently holds a live lease.
 * @param profiles - adopted identities, usually {@link ConnectorOwner.list}.
 * @param connected - true when `connectorId` has a live broker lease.
 * @returns the profile owner commands must use, or `undefined` when none is live.
 */
export function liveConnector(
  profiles: readonly ProfileConnector[],
  connected: (connectorId: string) => boolean,
): ProfileConnector | undefined {
  return profiles.find(profile => connected(profile.connectorId))
}
