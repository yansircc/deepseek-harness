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
import type { BridgeOwnerIdentity } from '../src/protocol/auth.ts'

const PORT = 17490
const credential = 'e2e-test-credential-0000000000000000000000000000000000000000000000000000000000000000'

describe('tool-chrome bridge', () => {
  let server: BridgeServer | undefined

  afterEach(async () => {
    await server?.stop()
    server = undefined
  })

  it('authenticates the owner and reaches the broker', async () => {
    server = new BridgeServer({
      host: '127.0.0.1',
      port: PORT,
      displayVersion: () => '0.1.0-rc.7',
    })
    server.setOwnerCredential(credential)
    await server.start()

    const identity: BridgeOwnerIdentity = {
      credential,
      protocolFingerprint: protocolFingerprint(),
    }

    // Owner authentication + status
    const status = await statusFromOwner(`http://127.0.0.1:${PORT}`, identity)
    expect(status.mode).toBe('server')
    expect(status.extensionExpectation.extensionId).toBe('ncikkhgopjmpkkcbgndgmolkfkiehlnm')

    // Command forwarding reaches the broker; no extension → ConnectorNotBound-style error
    await expect(
      forwardCommandToOwner(
        `http://127.0.0.1:${PORT}`,
        identity,
        { domain: 'system', call: { op: 'version' } as never },
        { key: 'session:e2e', groupTitle: 'e2e', foreground: true },
        5_000,
      ),
    ).rejects.toThrow(/extension is not connected|connector/i)
  })
})
