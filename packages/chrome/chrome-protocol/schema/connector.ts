/** Canonical Effect Schema source for the Chrome connector wire protocol. */
import * as Schema from 'effect/Schema'

const Hex256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/))
const NonBlank = Schema.NonEmptyString
const JsonValue: Schema.Schema<unknown> = Schema.suspend(() => Schema.Union([
  Schema.Null, Schema.Boolean, Schema.Finite, Schema.String,
  Schema.Array(JsonValue), Schema.Record(Schema.String, JsonValue),
]))

export const ConnectorHandshake = Schema.Struct({
  bridgeDisplayVersion: NonBlank,
  protocolFingerprint: Hex256,
  bridgeEpoch: Hex256,
  requestNonce: Hex256,
  proof: Hex256,
})
export const WireCommand = Schema.Struct({
  id: NonBlank,
  session: Schema.Struct({ key: NonBlank, groupTitle: NonBlank, foreground: Schema.Boolean }),
  domain: Schema.Literals(['tab', 'page', 'input', 'system']),
  call: Schema.Record(Schema.String, JsonValue),
})
export const WireFailure = Schema.Union([
  Schema.Struct({ _tag: Schema.Literal('CommandRejected'), code: Schema.String, message: Schema.String, details: Schema.optionalKey(JsonValue) }),
  Schema.Struct({ _tag: Schema.Literal('CommandOutcomeUnknown'), message: Schema.String, cause: Schema.String }),
])
export const WireResult = Schema.Union([
  Schema.Struct({ id: NonBlank, ok: Schema.Literal(true), value: JsonValue }),
  Schema.Struct({ id: NonBlank, ok: Schema.Literal(false), error: WireFailure }),
])
export const PollResponse = Schema.Union([
  Schema.Struct({ type: Schema.Literal('command'), command: WireCommand, expectedExtensionId: NonBlank, expectedExtensionDisplayVersion: NonBlank, expectedProtocolFingerprint: Hex256 }),
  Schema.Struct({ type: Schema.Literal('none'), expectedExtensionId: NonBlank, expectedExtensionDisplayVersion: NonBlank, expectedProtocolFingerprint: Hex256 }),
  Schema.Struct({ type: Schema.Literal('incompatible'), expectedExtensionId: NonBlank, expectedExtensionDisplayVersion: NonBlank, actualExtensionDisplayVersion: NonBlank, expectedProtocolFingerprint: Hex256, actualProtocolFingerprint: Hex256 }),
])
