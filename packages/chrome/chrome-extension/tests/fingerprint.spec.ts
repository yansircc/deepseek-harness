import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extensionPackageIdFromPublicKey } from '../src/shared/extension-package.ts'
import connectorAuth from '../src/protocol/connector-auth.json' with { type: 'json' }

const packageRoot = join(import.meta.dirname, '..')

type Evidence = {
  readonly extensionId: string
  readonly displayVersion: string
  readonly protocolFingerprint: string
}

describe('generated Chrome extension evidence', () => {
  it('pins the computed protocol fingerprint and extension identity', async () => {
    const evidence = JSON.parse(
      await readFile(join(packageRoot, 'dist/browser-extension/evidence.json'), 'utf8'),
    ) as Evidence
    expect(evidence).toEqual({
      extensionId: extensionPackageIdFromPublicKey(connectorAuth.extensionPublicKey),
      displayVersion: '0.5.3',
      protocolFingerprint: evidence.protocolFingerprint,
    })
    expect(evidence.protocolFingerprint).toMatch(/^[0-9a-f]{64}$/)
  })
})
