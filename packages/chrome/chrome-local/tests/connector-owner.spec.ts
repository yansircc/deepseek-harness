import { describe, expect, it } from 'vitest'
import { ChromeConnectorId } from '@deepseek-ai/dsh-chrome-protocol'
import { ConnectorOwner } from '../src/connector-owner.ts'

const profile = (id: string, secret = 'ab'.repeat(32)) => ({
  connectorId: ChromeConnectorId(id), secret, label: id, extensionId: 'extension',
  extensionDisplayVersion: '0.5.3', protocolFingerprint: 'ff'.repeat(32),
})

describe('transactional connector owner', () => {
  it('does not evict the live connector when proof fails', () => {
    const owner = new ConnectorOwner()
    owner.adoptAfterProof(profile('first'), 'ab'.repeat(32))
    expect(() => owner.adoptAfterProof(profile('second'), 'cd'.repeat(32))).toThrow(/prove/)
    expect(owner.authorize(ChromeConnectorId('first'))).toBeDefined()
    expect(owner.authorize(ChromeConnectorId('second'))).toBeUndefined()
  })
  it('returns the evicted id only after successful proof', () => {
    const owner = new ConnectorOwner()
    owner.adoptAfterProof(profile('first'), 'ab'.repeat(32))
    expect(owner.adoptAfterProof(profile('second'), 'ab'.repeat(32))).toBe(ChromeConnectorId('first'))
  })
})
