import { describe, expect, it } from 'vitest'
import { ConnectorOwner, liveConnector } from '../src/bridge/connector-registry.ts'
import type { ProfileConnector } from '../src/protocol/schema.ts'

const profile = (connectorId: string): ProfileConnector => ({
  connectorId,
  secret: 'aa'.repeat(32),
  label: `Chrome ${connectorId.slice(0, 8)}`,
  extensionId: 'extension-id',
  extensionDisplayVersion: '0.1.0',
  protocolFingerprint: 'ff'.repeat(32),
})

describe('ConnectorOwner', () => {
  it('replaces a previous connector id and keeps same-id rehandshake', () => {
    const owner = new ConnectorOwner()
    const first = profile('b50597ff-1111-4111-8111-111111111111')
    const second = profile('8db081d8-2222-4222-8222-222222222222')
    expect(owner.adopt(first)).toEqual([])
    expect(owner.adopt(second)).toEqual([first.connectorId])
    expect(owner.list().map(item => item.connectorId)).toEqual([second.connectorId])
    expect(owner.authorizedConnector(first.connectorId)).toBeUndefined()
    expect(owner.adopt({ ...second, label: 'Chrome renamed' })).toEqual([])
    expect(owner.authorizedConnector(second.connectorId)?.label).toBe('Chrome renamed')
  })
})

describe('liveConnector', () => {
  it('skips an offline first id and returns the leased profile', () => {
    const stale = profile('b50597ff-1111-4111-8111-111111111111')
    const live = profile('8db081d8-2222-4222-8222-222222222222')
    expect(liveConnector([stale, live], id => id === live.connectorId)).toEqual(live)
    expect(liveConnector([stale, live], () => false)).toBeUndefined()
  })
})
