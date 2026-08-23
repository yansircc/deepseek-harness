/**
 * Bridge E2E: start a BridgeServer, verify owner authentication and command
 * forwarding reach the broker (no extension connected → ConnectorNotBound).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { BridgeServer } from '../src/bridge/server.ts'
import {
  statusFromOwner,
  forwardCommandToOwner,
} from '../src/bridge/owner-client.ts'
import { protocolFingerprint } from '../src/protocol/fingerprint.ts'
import { EXTENSION_PACKAGE_ID } from '../src/bridge/extension-package.ts'
import {
  CONNECTOR_BODY_SHA256_HEADER,
  CONNECTOR_BRIDGE_EPOCH_HEADER,
  CONNECTOR_CLIENT_NONCE_HEADER,
  CONNECTOR_EXTENSION_ID_HEADER,
  CONNECTOR_ID_HEADER,
  CONNECTOR_PROOF_HEADER,
  CONNECTOR_REQUEST_NONCE_HEADER,
  connectorRequestProofMessage,
  freshAuthenticationToken,
  hashBridgeRequestBody,
  nodeHmacProof,
  type BridgeOwnerIdentity,
} from '../src/protocol/auth.ts'
import { CONNECTOR_PROTOCOL_FINGERPRINT_HEADER } from '../src/protocol/connector-auth.ts'
import type { BridgeAuthenticationHandshake, PollResponse, ProfileConnector } from '../src/protocol/schema.ts'

const PORT = 17490
const DISPLAY_VERSION = '0.1.0-rc.7'
const credential = 'e2e-test-credential-0000000000000000000000000000000000000000000000000000000000000000'
const connectorSecret = 'ab'.repeat(32)

const ownerIdentity = (): BridgeOwnerIdentity => ({
  credential,
  protocolFingerprint: protocolFingerprint(),
})

const profile = (connectorId: string): ProfileConnector => ({
  connectorId,
  secret: connectorSecret,
  label: `Chrome ${connectorId.slice(0, 8)}`,
  extensionId: EXTENSION_PACKAGE_ID,
  extensionDisplayVersion: DISPLAY_VERSION,
  protocolFingerprint: protocolFingerprint(),
})

const handshakeConnector = async (
  url: string,
  connector: ProfileConnector,
): Promise<BridgeAuthenticationHandshake> => {
  const response = await fetch(`${url}/connector/handshake`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [CONNECTOR_ID_HEADER]: connector.connectorId,
      [CONNECTOR_EXTENSION_ID_HEADER]: connector.extensionId,
      [CONNECTOR_CLIENT_NONCE_HEADER]: freshAuthenticationToken(),
      [CONNECTOR_PROTOCOL_FINGERPRINT_HEADER]: connector.protocolFingerprint,
    },
    body: JSON.stringify(connector),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`connector handshake HTTP ${response.status}: ${text}`)
  }
  return JSON.parse(text) as BridgeAuthenticationHandshake
}

const connectorFetch = async (
  url: string,
  connector: ProfileConnector,
  method: string,
  path: string,
  body = '',
): Promise<Response> => {
  const handshake = await handshakeConnector(url, connector)
  const challenge = {
    bridgeEpoch: handshake.bridgeEpoch,
    requestNonce: handshake.requestNonce,
  }
  const bodyHash = hashBridgeRequestBody(body)
  const proof = nodeHmacProof(
    connector.secret,
    connectorRequestProofMessage(
      'connectorRequestProof',
      connector,
      challenge,
      method,
      path,
      bodyHash,
    ),
  )
  return fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body === '' ? {} : { 'content-type': 'application/json' }),
      [CONNECTOR_ID_HEADER]: connector.connectorId,
      [CONNECTOR_EXTENSION_ID_HEADER]: connector.extensionId,
      [CONNECTOR_PROTOCOL_FINGERPRINT_HEADER]: connector.protocolFingerprint,
      [CONNECTOR_BRIDGE_EPOCH_HEADER]: challenge.bridgeEpoch,
      [CONNECTOR_REQUEST_NONCE_HEADER]: challenge.requestNonce,
      [CONNECTOR_BODY_SHA256_HEADER]: bodyHash,
      [CONNECTOR_PROOF_HEADER]: proof,
    },
    ...(body === '' ? {} : { body }),
  })
}

describe('tool-chrome bridge', () => {
  let server: BridgeServer | undefined

  afterEach(async () => {
    await server?.stop()
    server = undefined
  })

  const start = async (): Promise<string> => {
    server = new BridgeServer({
      host: '127.0.0.1',
      port: PORT,
      displayVersion: () => DISPLAY_VERSION,
    })
    server.setOwnerCredential(credential)
    await server.start()
    return `http://127.0.0.1:${PORT}`
  }

  it('authenticates the owner and reaches the broker', async () => {
    const url = await start()
    const identity = ownerIdentity()

    const status = await statusFromOwner(url, identity)
    expect(status.mode).toBe('server')
    expect(status.extensionExpectation.extensionId).toBe('ncikkhgopjmpkkcbgndgmolkfkiehlnm')

    await expect(
      forwardCommandToOwner(
        url,
        identity,
        { domain: 'system', call: { op: 'version' } as never },
        { key: 'session:e2e', groupTitle: 'e2e', foreground: true },
        5_000,
      ),
    ).rejects.toThrow(/extension is not connected|connector/i)
  })

  it('does not evict a live connector when a handshake header does not match the body', async () => {
    const url = await start()
    const identity = ownerIdentity()
    const live = profile('8db081d8-2222-4222-8222-222222222222')
    await handshakeConnector(url, live)
    const poll = connectorFetch(url, live, 'GET', '/next').catch(() => undefined)
    await expect.poll(async () => {
      const waiting = await statusFromOwner(url, identity)
      return waiting.connector?.connectorId === live.connectorId && waiting.connector.connected === true
    }).toBe(true)
    const rejected = await fetch(`${url}/connector/handshake`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [CONNECTOR_ID_HEADER]: 'b50597ff-1111-4111-8111-111111111111',
        [CONNECTOR_EXTENSION_ID_HEADER]: live.extensionId,
        [CONNECTOR_CLIENT_NONCE_HEADER]: freshAuthenticationToken(),
        [CONNECTOR_PROTOCOL_FINGERPRINT_HEADER]: live.protocolFingerprint,
      },
      body: JSON.stringify(live),
    })
    expect(rejected.status).toBe(401)
    const status = await statusFromOwner(url, identity)
    expect(status.connector?.connectorId).toBe(live.connectorId)
    expect(status.connector?.connected).toBe(true)
    expect(poll).toBeInstanceOf(Promise)
  })

  it('forwards owner commands to the live connector after a later handshake replaces the first id', async () => {
    const url = await start()
    const identity = ownerIdentity()
    const stale = profile('b50597ff-1111-4111-8111-111111111111')
    const live = profile('8db081d8-2222-4222-8222-222222222222')
    await handshakeConnector(url, stale)
    await handshakeConnector(url, live)

    await expect(
      forwardCommandToOwner(
        url,
        identity,
        { domain: 'system', call: { op: 'version' } as never },
        { key: 'session:e2e', groupTitle: 'e2e', foreground: true },
        1_000,
      ),
    ).rejects.toThrow(/extension is not connected/)

    const poll = connectorFetch(url, live, 'GET', '/next')
    await expect.poll(async () => {
      const waiting = await statusFromOwner(url, identity)
      return waiting.connector?.connected === true && waiting.connector.connectorId === live.connectorId
    }).toBe(true)

    const command = forwardCommandToOwner(
      url,
      identity,
      { domain: 'system', call: { op: 'version' } as never },
      { key: 'session:e2e', groupTitle: 'e2e', foreground: true },
      5_000,
    )
    const polled = await poll
    const payload = JSON.parse(await polled.text()) as PollResponse
    expect(payload.type).toBe('command')
    if (payload.type !== 'command') throw new Error('expected a command poll')

    const result = await connectorFetch(
      url,
      live,
      'POST',
      '/result',
      JSON.stringify({ id: payload.command.id, ok: true, value: { version: 'e2e' } }),
    )
    expect(result.ok).toBe(true)
    await expect(command).resolves.toEqual({ version: 'e2e' })

    const status = await statusFromOwner(url, identity)
    expect(status.connector?.connectorId).toBe(live.connectorId)
    expect(status.connector?.connected).toBe(true)
  })
})
