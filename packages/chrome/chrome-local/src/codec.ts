/** Runtime decoding for every local connector HTTP body. */
import {
  ChromeConnectorId,
} from '@deepseek-ai/dsh-chrome-protocol'
import { ProtocolFailure } from './bridge/errors.ts'
import type { ProfileConnector } from './types.ts'
import { decodeWireResult as decodeGeneratedWireResult, type WireResult } from '@deepseek-ai/dsh-chrome-protocol'

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

/** Decode one result body through the generated protocol runtime.
 * @param text - Raw JSON body.
 * @returns Validated wire result.
 */
export const decodeWireResult = (text: string): WireResult => decodeGeneratedWireResult(parse('wire result', text))
