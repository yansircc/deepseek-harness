import { describe, expect, it } from 'vitest'
import * as Effect from 'effect/Effect'
import * as Schema from 'effect/Schema'
import {
  decodeConnectorHandshake,
  decodeWireResult,
  type PollResponse as HostPollResponse,
} from '@deepseek-ai/dsh-chrome-protocol'
import {
  BridgeAuthenticationHandshake,
  PollResponse,
  WireResult,
} from '../src/protocol/schema.ts'

const hex = 'ab'.repeat(32)
const extensionDecode = <A>(schema: Schema.Schema<A>, value: unknown): A =>
  Effect.runSync(Schema.decodeUnknownEffect(schema)(value) as Effect.Effect<A, Schema.SchemaError>)

describe('Host and Extension connector interoperability', () => {
  it('accepts the same handshake fields', () => {
    const value = { bridgeDisplayVersion: '0.5.3', protocolFingerprint: hex, bridgeEpoch: hex, requestNonce: hex, proof: hex }
    expect(decodeConnectorHandshake(value)).toEqual(value)
    expect(extensionDecode(BridgeAuthenticationHandshake, value)).toEqual(value)
  })

  it('accepts the same poll and result envelopes', () => {
    const poll: HostPollResponse = {
      type: 'none', expectedExtensionId: 'a'.repeat(32), expectedExtensionDisplayVersion: '0.5.3', expectedProtocolFingerprint: hex,
    }
    expect(extensionDecode(PollResponse, poll)).toEqual(poll)
    const result = { id: 'command', ok: false, error: { _tag: 'CommandRejected', code: 'blocked', message: 'no' } } as const
    expect(decodeWireResult(result)).toEqual(result)
    expect(extensionDecode(WireResult, result)).toEqual(result)
  })
})
