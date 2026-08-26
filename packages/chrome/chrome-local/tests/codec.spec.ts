import { describe, expect, it } from 'vitest'
import { decodeProfileConnector, decodeWireResult } from '../src/codec.ts'

const profile = {
  connectorId: '8db081d8-2222-4222-8222-222222222222', secret: 'ab'.repeat(32), label: 'Chrome test',
  extensionId: 'extension', extensionDisplayVersion: '0.5.3', protocolFingerprint: 'ff'.repeat(32),
}

describe('chrome-local wire decoding', () => {
  it('decodes and brands complete connector metadata', () => {
    expect(decodeProfileConnector(JSON.stringify(profile))).toMatchObject(profile)
  })
  it.each([
    '{',
    JSON.stringify({ ...profile, secret: 'bad' }),
    JSON.stringify({ ...profile, connectorId: '' }),
  ])('rejects invalid connector input', body => expect(() => decodeProfileConnector(body)).toThrow())
  it('decodes successful and rejected results', () => {
    expect(decodeWireResult(JSON.stringify({ id: 'command-1', ok: true, value: { ready: true } }))).toMatchObject({ ok: true })
    expect(decodeWireResult(JSON.stringify({
      id: 'command-2', ok: false,
      error: { _tag: 'CommandRejected', code: 'rejected', message: 'no' },
    }))).toMatchObject({ ok: false })
  })
  it('rejects unknown result fields and codes', () => {
    expect(() => decodeWireResult(JSON.stringify({ id: 'c', ok: true, value: null, secret: 'x' }))).toThrow(/unknown fields/)
    expect(() => decodeWireResult(JSON.stringify({
      id: 'c', ok: false, error: { _tag: 'Other', message: 'x' },
    }))).toThrow(/unsupported/)
  })
})
