/**
 * Public Chrome status endpoint: forwards extensionExpectation and a
 * secret-free connector summary for the WebUI card.
 */

import { afterEach, describe, expect, it } from 'vitest'
import { BridgeServer } from '../src/bridge/server.ts'
import {
  computeChromeStatus,
  publicConnectorSummary,
  retainPublicConnector,
} from '../src/bridge/status-endpoint.ts'
import { protocolFingerprint } from '../src/protocol/fingerprint.ts'
import { EXTENSION_PACKAGE_ID } from '../src/bridge/extension-package.ts'
import type { BridgeOwnerIdentity } from '../src/protocol/auth.ts'
import type { ConnectorStatus } from '../src/protocol/schema.ts'

const PORT = 17493
const DISPLAY_VERSION = '0.1.0-rc.7'
const credential = 'status-endpoint-credential-0000000000000000000000000000000000000000000000000000'

const ownerIdentity = (): BridgeOwnerIdentity => ({
  credential,
  protocolFingerprint: protocolFingerprint(),
})

const liveSummary = {
  extensionId: EXTENSION_PACKAGE_ID,
  extensionDisplayVersion: DISPLAY_VERSION,
  protocolFingerprint: protocolFingerprint(),
  connected: true as const,
  label: 'Chrome local',
  lastSeenAt: 1_700_000_000_000,
  queuedCommands: 0,
  pendingCommands: 0,
}

describe('status-endpoint', () => {
  const servers: BridgeServer[] = []
  afterEach(async () => {
    for (const server of servers.splice(0).reverse()) await server.stop()
  })

  it('projects a connector status without connectorId or secrets', () => {
    const connector: ConnectorStatus = {
      connectorId: 'connector-secret-must-not-leak',
      extensionId: EXTENSION_PACKAGE_ID,
      extensionDisplayVersion: DISPLAY_VERSION,
      protocolFingerprint: protocolFingerprint(),
      label: 'Chrome local',
      connected: true,
      lastSeenAt: 1_700_000_000_000,
      queuedCommands: 2,
      pendingCommands: 1,
    }
    expect(publicConnectorSummary(connector)).toEqual({
      extensionId: EXTENSION_PACKAGE_ID,
      extensionDisplayVersion: DISPLAY_VERSION,
      protocolFingerprint: protocolFingerprint(),
      label: 'Chrome local',
      connected: true,
      lastSeenAt: 1_700_000_000_000,
      queuedCommands: 2,
      pendingCommands: 1,
    })
    expect(publicConnectorSummary(connector)).not.toHaveProperty('connectorId')
  })

  it('returns unconfigured when the owner identity is missing', async () => {
    const payload = await computeChromeStatus('http://127.0.0.1:9', async () => undefined)
    expect(payload).toEqual({
      state: 'unconfigured',
      url: 'http://127.0.0.1:9',
      extensionExpectation: null,
      connector: null,
      error: 'Owner credential is not configured',
    })
  })

  it('forwards extensionExpectation while waiting for a connector', async () => {
    const server = new BridgeServer({
      host: '127.0.0.1',
      port: PORT,
      displayVersion: () => DISPLAY_VERSION,
    })
    servers.push(server)
    server.setOwnerCredential(credential)
    await server.start()

    const payload = await computeChromeStatus(server.url, async () => ownerIdentity())
    expect(payload.state).toBe('waiting-for-extension')
    expect(payload.url).toBe(server.url)
    expect(payload.error).toBeNull()
    expect(payload.connector).toBeNull()
    expect(payload.extensionExpectation).toEqual({
      extensionId: EXTENSION_PACKAGE_ID,
      displayVersion: DISPLAY_VERSION,
      protocolFingerprint: protocolFingerprint(),
    })
  })

  it('returns offline with a host error when the bridge is unreachable', async () => {
    const payload = await computeChromeStatus(
      'http://127.0.0.1:1',
      async () => ownerIdentity(),
    )
    expect(payload.state).toBe('offline')
    expect(payload.extensionExpectation).toBeNull()
    expect(payload.connector).toBeNull()
    expect(payload.error).toEqual(expect.stringMatching(/./))
  })

  it('retainPublicConnector keeps computeChromeStatus stateless and surfaces stale', () => {
    const waiting = {
      state: 'waiting-for-extension' as const,
      url: 'http://127.0.0.1:17400',
      extensionExpectation: {
        extensionId: EXTENSION_PACKAGE_ID,
        displayVersion: DISPLAY_VERSION,
        protocolFingerprint: protocolFingerprint(),
      },
      connector: null,
      error: null,
    }
    const ready = {
      ...waiting,
      state: 'ready' as const,
      connector: liveSummary,
    }

    expect(retainPublicConnector(waiting, null)).toEqual({
      payload: waiting,
      lastLive: null,
    })

    const afterLive = retainPublicConnector(ready, null)
    expect(afterLive.lastLive).toEqual(liveSummary)
    expect(afterLive.payload.connector?.connected).toBe(true)

    const afterDrop = retainPublicConnector(waiting, afterLive.lastLive)
    expect(afterDrop.lastLive).toEqual(liveSummary)
    expect(afterDrop.payload.state).toBe('waiting-for-extension')
    expect(afterDrop.payload.connector).toEqual({
      ...liveSummary,
      connected: false,
    })
    expect(afterDrop.payload.connector).not.toHaveProperty('connectorId')

    const offline = {
      state: 'offline' as const,
      url: waiting.url,
      extensionExpectation: null,
      connector: null,
      error: 'unreachable',
    }
    expect(retainPublicConnector(offline, afterLive.lastLive)).toEqual({
      payload: offline,
      lastLive: afterLive.lastLive,
    })
  })
})
