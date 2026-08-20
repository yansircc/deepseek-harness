/**
 * Wire codec: JSON decode of bridge protocol payloads and bridge-failure
 * conversion. Ported from the pi-chrome extension (`src/protocol/codec.ts`)
 * with Effect Schema replaced by plain parse + shape checks.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/codec
 */

import { ProtocolFailure, messageOf, type BridgeFailure } from './errors.ts'
import type {
  BridgeAuthenticationHandshake,
  BridgeStatusResponse,
  ForwardRequest,
  ForwardResponse,
  PollResponse,
  WireBridgeFailure,
  WireCommandTerminalFailure,
  WireResult,
} from '../protocol/schema.ts'

const parseJson = <T>(label: string, text: string): T => {
  try {
    return JSON.parse(text) as T
  } catch (cause) {
    throw new ProtocolFailure(`Invalid ${label}`, cause)
  }
}

/**
 * Parse a connector-posted command result body as JSON without validating fields.
 * @param text - raw response body.
 * @returns the parsed value asserted as `WireResult`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodeWireResultJson = (text: string): WireResult =>
  parseJson<WireResult>('wire result', text)
/**
 * Parse an owner-forwarded command request body as JSON without validating fields.
 * @param text - raw request body.
 * @returns the parsed value asserted as `ForwardRequest`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodeForwardRequestJson = (text: string): ForwardRequest =>
  parseJson<ForwardRequest>('forward request', text)
/**
 * Parse an owner-forwarded command response body as JSON without validating fields.
 * @param text - raw response body.
 * @returns the parsed value asserted as `ForwardResponse`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodeForwardResponseJson = (text: string): ForwardResponse =>
  parseJson<ForwardResponse>('forward response', text)
/**
 * Parse a connector poll response body as JSON without validating fields.
 * @param text - raw response body.
 * @returns the parsed value asserted as `PollResponse`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodePollResponseJson = (text: string): PollResponse =>
  parseJson<PollResponse>('poll response', text)
/**
 * Parse a bridge status response body as JSON without validating fields.
 * @param text - raw response body.
 * @returns the parsed value asserted as `BridgeStatusResponse`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodeBridgeStatusJson = (text: string): BridgeStatusResponse =>
  parseJson<BridgeStatusResponse>('bridge status', text)
/**
 * Parse an owner or connector authentication handshake body as JSON without validating fields.
 * @param text - raw response body.
 * @returns the parsed value asserted as `BridgeAuthenticationHandshake`.
 * @throws ProtocolFailure when `text` is not JSON.
 */
export const decodeBridgeAuthenticationHandshakeJson = (text: string): BridgeAuthenticationHandshake =>
  parseJson<BridgeAuthenticationHandshake>('bridge authentication handshake', text)

const toWireCommandTerminalFailure = (
  error: { _tag: string; code?: string; message: string; details?: unknown; cause?: unknown },
): WireCommandTerminalFailure => {
  if (error._tag === 'CommandRejected') {
    return {
      _tag: 'CommandRejected',
      code: error.code ?? 'unknown',
      message: error.message,
      ...(error.details === undefined
        ? {}
        : { details: error.details as import('../protocol/schema.ts').JsonValue }),
    }
  }
  return {
    _tag: 'CommandOutcomeUnknown',
    message: error.message,
    cause: messageOf(error.cause),
  }
}

/**
 * Lift a wire terminal failure into a local `ProtocolFailure`.
 * @param error - rejected or outcome-unknown payload from the connector.
 * @returns a `ProtocolFailure` whose message and cause preserve the wire fields.
 */
export const fromWireCommandTerminalFailure = (
  error: WireCommandTerminalFailure,
): BridgeFailure =>
  error._tag === 'CommandRejected'
    ? new ProtocolFailure(`Chrome command rejected: ${error.code}: ${error.message}`, error)
    : new ProtocolFailure(`Chrome command outcome unknown: ${error.message}`, error)

/**
 * Build an `ok: false` wire result. `CommandRejected` keeps its code and
 * details; every other `BridgeFailure` becomes `CommandOutcomeUnknown`.
 * @param id - command id the failure answers.
 * @param error - local failure to project.
 * @returns the failed result envelope.
 */
export const makeWireFailureResult = (
  id: string,
  error: BridgeFailure,
): WireResult => ({
  id,
  ok: false,
  error: toWireBridgeTerminal(error),
})

const toWireBridgeTerminal = (error: BridgeFailure): WireCommandTerminalFailure => {
  if (error._tag === 'CommandRejected') {
    return {
      _tag: 'CommandRejected',
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    }
  }
  return {
    _tag: 'CommandOutcomeUnknown',
    message: error.message,
    cause: messageOf(error.cause),
  }
}

/**
 * Project an unknown thrown value onto the owner-visible wire failure union.
 * Untagged values become `ProtocolFailure`.
 * @param error - thrown value, typically a `BridgeFailure` subclass.
 * @returns the wire failure object placed on a forward-error response.
 */
export const toWireBridgeFailure = (error: unknown): WireBridgeFailure => {
  if (typeof error !== 'object' || error === null || !('_tag' in error)) {
    return { _tag: 'ProtocolFailure', message: messageOf(error), cause: messageOf(error) }
  }
  const e = error as { _tag: string; message: string; cause?: unknown; connectorId?: string; timeoutMs?: number }
  switch (e._tag) {
    case 'BridgeStopped':
    case 'ConnectorNotBound':
      return { _tag: e._tag as 'BridgeStopped', message: e.message }
    case 'BridgeUnavailable':
      return e.cause === undefined
        ? { _tag: 'BridgeUnavailable', message: e.message }
        : { _tag: 'BridgeUnavailable', message: e.message, cause: messageOf(e.cause) }
    case 'ConnectorOffline':
      return { _tag: 'ConnectorOffline', connectorId: String(e.connectorId), message: e.message }
    case 'CommandTimeout':
      return { _tag: 'CommandTimeout', message: e.message, timeoutMs: Number(e.timeoutMs) }
    case 'CommandOutcomeUnknown':
    case 'CommandRejected':
      return toWireCommandTerminalFailure(e as never)
    case 'ProtocolFailure':
    default:
      return { _tag: 'ProtocolFailure', message: e.message, cause: messageOf(e.cause) }
  }
}
