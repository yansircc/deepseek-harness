/**
 * Protocol fingerprint drift gate: computed hash must equal packaged evidence
 * and every bundled extension literal the connector presents.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  EXTENSION_PROTOCOL_FINGERPRINT,
  readExtensionEvidence,
} from '../src/bridge/extension-package.ts'
import {
  canonicalProtocolContractFor,
  protocolFingerprint,
} from '../src/protocol/fingerprint.ts'
import { WireProtocolContract } from '../src/protocol/schema.ts'
import {
  wireCallContractByDomain,
  wireCallSchemaFor,
} from '../src/protocol/wire-call-contract.ts'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(packageDir, 'assets/browser-extension')

const HEX_64 = /^[0-9a-f]{64}$/

describe('protocol fingerprint pin authority', () => {
  it('aligns computed fingerprint, evidence.json, host expectation, and bundled literals', () => {
    const computed = protocolFingerprint()
    const evidence = readExtensionEvidence()
    const serviceWorker = readFileSync(join(assetsDir, 'service-worker.js'), 'utf8')
    const popup = readFileSync(join(assetsDir, 'popup.js'), 'utf8')

    expect(computed).toMatch(HEX_64)
    expect(evidence.protocolFingerprint).toBe(computed)
    expect(EXTENSION_PROTOCOL_FINGERPRINT).toBe(computed)

    const profileLiteral = serviceWorker.match(
      /protocolFingerprint:\s*"([0-9a-f]{64})"/,
    )
    const probeLiteral = serviceWorker.match(
      /handleChromeExtensionProbe\(\s*message,\s*chrome\.runtime,\s*"([0-9a-f]{64})"\s*\)/,
    )
    expect(profileLiteral?.[1]).toBe(computed)
    expect(probeLiteral?.[1]).toBe(computed)

    expect(serviceWorker).not.toContain(
      '593fb1f978e0ef1f0e3896f02cde26ac64ac647909a6c93aa7eb7fc4660cd501',
    )
    expect(popup).not.toContain(
      '593fb1f978e0ef1f0e3896f02cde26ac64ac647909a6c93aa7eb7fc4660cd501',
    )
  })

  it('projects complete WireCommand call unions instead of a bare call object', () => {
    const wireCommand = JSON.stringify(WireProtocolContract.wireCommand)
    expect(wireCommand).not.toMatch(/"call":\{"type":"object"\}/)
    expect(wireCommand).toContain('"clear-stale"')
    expect(wireCommand).toContain('"const":"page"')
    expect(wireCommand).toContain('"const":"screenshot"')

    const calls = wireCallContractByDomain()
    for (const domain of ['tab', 'page', 'input', 'system'] as const) {
      const node = calls[domain]
      const members = node.oneOf ?? [node]
      expect(members.length).toBeGreaterThan(0)
      for (const member of members) {
        expect(member.properties?.op?.const).toEqual(expect.any(String))
      }
    }

    expect(JSON.stringify(WireProtocolContract.pollResponse)).toContain('"command"')
    expect(JSON.stringify(WireProtocolContract.forwardRequest)).toContain('"clear-stale"')
  })

  it('changes the fingerprint when a call field nest or required set changes', () => {
    const flat = wireCallSchemaFor('evaluate', {
      expression: { type: 'string', required: true },
    })
    const nested = wireCallSchemaFor('evaluate', {
      operation: {
        type: 'object',
        required: true,
        properties: {
          kind: { type: 'string', enum: ['evaluate'] },
          expression: { type: 'string', required: true },
        },
      },
    })
    const hashOf = (call: unknown) =>
      createHash('sha256')
        .update(canonicalProtocolContractFor({ wire: { call } }), 'utf8')
        .digest('hex')
    expect(hashOf(flat)).not.toBe(hashOf(nested))
    expect(flat.properties?.expression).toBeDefined()
    expect(nested.properties?.operation).toBeDefined()
    expect(protocolFingerprint()).toMatch(HEX_64)
  })
})
