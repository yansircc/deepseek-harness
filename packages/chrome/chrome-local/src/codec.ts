/** Runtime decoding for every local connector HTTP body. */
import {
  ChromeCommandId,
  ChromeConnectorId,
  type ChromeJsonValue,
} from '@deepseek-ai/dsh-chrome-protocol'
import { ProtocolFailure } from './bridge/errors.ts'
import type { ProfileConnector, WireResult } from './types.ts'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parse = (label: string, text: string): unknown => {
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new ProtocolFailure(`Invalid ${label}`, cause)
  }
}

const string = (record: Record<string, unknown>, field: string): string => {
  const value = record[field]
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new ProtocolFailure(`${field} must be a bounded non-empty string`)
  }
  return value
}

const jsonValue = (value: unknown, depth = 0): ChromeJsonValue => {
  if (depth > 12) throw new ProtocolFailure('JSON value is too deeply nested')
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map(item => jsonValue(item, depth + 1))
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item, depth + 1)]))
  throw new ProtocolFailure('value is not JSON-compatible')
}

/** Decode and brand one connector handshake body.
 * @param text - Raw JSON body.
 * @returns Validated connector profile.
 */
export const decodeProfileConnector = (text: string): ProfileConnector => {
  const value = parse('connector metadata', text)
  if (!isRecord(value)) throw new ProtocolFailure('connector metadata must be an object')
  const secret = string(value, 'secret')
  if (!/^[0-9a-f]{64}$/.test(secret)) throw new ProtocolFailure('connector secret must be 64 lowercase hex characters')
  const rawId = string(value, 'connectorId')
  if (!/^[0-9a-f-]{16,64}$/i.test(rawId)) throw new ProtocolFailure('connectorId is malformed')
  return {
    connectorId: ChromeConnectorId(rawId),
    secret,
    label: string(value, 'label'),
    extensionId: string(value, 'extensionId'),
    extensionDisplayVersion: string(value, 'extensionDisplayVersion'),
    protocolFingerprint: string(value, 'protocolFingerprint'),
  }
}

/** Decode one result body and reject missing, excess, or invalid fields.
 * @param text - Raw JSON body.
 * @returns Validated wire result.
 */
export const decodeWireResult = (text: string): WireResult => {
  const value = parse('wire result', text)
  if (!isRecord(value) || typeof value.ok !== 'boolean') throw new ProtocolFailure('wire result is malformed')
  const allowed = value.ok ? new Set(['id', 'ok', 'value']) : new Set(['id', 'ok', 'error'])
  if (Object.keys(value).some(key => !allowed.has(key))) throw new ProtocolFailure('wire result has unknown fields')
  const id = ChromeCommandId(string(value, 'id'))
  if (value.ok) return { id, ok: true, value: jsonValue(value.value) }
  if (!isRecord(value.error)) throw new ProtocolFailure('wire result error is malformed')
  const tag = string(value.error, '_tag')
  const message = string(value.error, 'message')
  if (tag === 'CommandRejected') {
    return {
      id,
      ok: false,
      error: {
        _tag: tag,
        code: string(value.error, 'code'),
        message,
        ...(value.error.details === undefined ? {} : { details: jsonValue(value.error.details) }),
      },
    }
  }
  if (tag === 'CommandOutcomeUnknown') {
    return { id, ok: false, error: { _tag: tag, message, cause: string(value.error, 'cause') } }
  }
  throw new ProtocolFailure('wire result error tag is unsupported')
}
