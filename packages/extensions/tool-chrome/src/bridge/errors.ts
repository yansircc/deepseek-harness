/**
 * Bridge error types. Ported from the pi-chrome extension
 * (`src/core/errors.ts`) with Effect Data.TaggedError replaced by plain
 * Error subclasses carrying a `_tag` discriminant.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/errors
 */

import type { JsonValue } from '../protocol/schema.ts'

/** The local bridge process has stopped and will not accept further work. */
export class BridgeStopped extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'BridgeStopped' as const
  constructor(message: string) {
    super(message)
    this.name = 'BridgeStopped'
  }
}

/** The bridge HTTP server failed to bind its listen address. */
export class BridgeBindFailed extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'BridgeBindFailed' as const
  override readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'BridgeBindFailed'
    this.cause = cause
  }
}

/** The bridge is not running or not reachable from this process. */
export class BridgeUnavailable extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'BridgeUnavailable' as const
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'BridgeUnavailable'
    this.cause = cause
  }
}

/** The owner HTTP client could not reach the running bridge. */
export class BridgeOwnerUnreachable extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'BridgeOwnerUnreachable' as const
  override readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'BridgeOwnerUnreachable'
    this.cause = cause
  }
}

/** No Chrome extension connector is bound to the bridge. */
export class ConnectorNotBound extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ConnectorNotBound' as const
  constructor(message: string) {
    super(message)
    this.name = 'ConnectorNotBound'
  }
}

/** The bound connector is registered but not currently connected. */
export class ConnectorOffline extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ConnectorOffline' as const
  /** Connector id that was last bound when the failure occurred. */
  readonly connectorId: string
  constructor(connectorId: string, message: string) {
    super(message)
    this.name = 'ConnectorOffline'
    this.connectorId = connectorId
  }
}

/** A second connector tried to bind while another id already owns the slot. */
export class ConnectorAlreadyBound extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ConnectorAlreadyBound' as const
  /** Connector id that already owns the bound slot. */
  readonly actualConnectorId: string
  constructor(actualConnectorId: string, message: string) {
    super(message)
    this.name = 'ConnectorAlreadyBound'
    this.actualConnectorId = actualConnectorId
  }
}

/** Connector HMAC or handshake proof was rejected. */
export class ConnectorAuthenticationFailed extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ConnectorAuthenticationFailed' as const
  constructor(message: string) {
    super(message)
    this.name = 'ConnectorAuthenticationFailed'
  }
}

/** A command did not complete before its deadline. */
export class CommandTimeout extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'CommandTimeout' as const
  /** Deadline that elapsed, in milliseconds. */
  readonly timeoutMs: number
  constructor(message: string, timeoutMs: number) {
    super(message)
    this.name = 'CommandTimeout'
    this.timeoutMs = timeoutMs
  }
}

/** The command finished on the wire but its terminal outcome could not be recovered. */
export class CommandOutcomeUnknown extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'CommandOutcomeUnknown' as const
  override readonly cause: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'CommandOutcomeUnknown'
    this.cause = cause
  }
}

/** The connector or Chrome rejected the command with a business code. */
export class CommandRejected extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'CommandRejected' as const
  /** Connector-supplied rejection code. */
  readonly code: string
  /** Optional structured details from the rejection payload. */
  readonly details?: JsonValue
  constructor(payload: { code: string; message: string; details?: JsonValue }) {
    super(payload.message)
    this.name = 'CommandRejected'
    this.code = payload.code
    if (payload.details !== undefined) this.details = payload.details
  }
}

/** A request or response failed protocol validation. */
export class ProtocolFailure extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ProtocolFailure' as const
  override readonly cause: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ProtocolFailure'
    this.cause = cause
  }
}

/** Screenshot capture or encoding failed in Chrome or the connector. */
export class ScreenshotFailure extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ScreenshotFailure' as const
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ScreenshotFailure'
    this.cause = cause
  }
}

/** Chrome is not running or the extension cannot reach a usable profile. */
export class ChromeUnavailable extends Error {
  /** Closed-union discriminant for this failure. */
  readonly _tag = 'ChromeUnavailable' as const
  constructor(message: string) {
    super(message)
    this.name = 'ChromeUnavailable'
  }
}

/** Failures the owner client maps from a command attempt. */
export type BridgeFailure =
  | BridgeStopped
  | BridgeUnavailable
  | ConnectorNotBound
  | ConnectorOffline
  | CommandTimeout
  | CommandOutcomeUnknown
  | CommandRejected
  | ProtocolFailure

/**
 * Read a human-readable message from an unknown thrown value.
 * @param error - the caught value, which may not be an `Error`.
 * @returns `error.message` when present, otherwise `String(error)`.
 */
export const messageOf = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error)
