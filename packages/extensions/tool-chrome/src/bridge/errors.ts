/**
 * Bridge error types. Ported from the pi-chrome extension
 * (`src/core/errors.ts`) with Effect Data.TaggedError replaced by plain
 * Error subclasses carrying a `_tag` discriminant.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/errors
 */

import type { JsonValue } from '../protocol/schema.ts'

export class BridgeStopped extends Error {
  readonly _tag = 'BridgeStopped' as const
  constructor(message: string) {
    super(message)
    this.name = 'BridgeStopped'
  }
}

export class BridgeBindFailed extends Error {
  readonly _tag = 'BridgeBindFailed' as const
  override readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'BridgeBindFailed'
    this.cause = cause
  }
}

export class BridgeUnavailable extends Error {
  readonly _tag = 'BridgeUnavailable' as const
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'BridgeUnavailable'
    this.cause = cause
  }
}

export class BridgeOwnerUnreachable extends Error {
  readonly _tag = 'BridgeOwnerUnreachable' as const
  override readonly cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'BridgeOwnerUnreachable'
    this.cause = cause
  }
}

export class ConnectorNotBound extends Error {
  readonly _tag = 'ConnectorNotBound' as const
  constructor(message: string) {
    super(message)
    this.name = 'ConnectorNotBound'
  }
}

export class ConnectorOffline extends Error {
  readonly _tag = 'ConnectorOffline' as const
  readonly connectorId: string
  constructor(connectorId: string, message: string) {
    super(message)
    this.name = 'ConnectorOffline'
    this.connectorId = connectorId
  }
}

export class ConnectorAlreadyBound extends Error {
  readonly _tag = 'ConnectorAlreadyBound' as const
  readonly actualConnectorId: string
  constructor(actualConnectorId: string, message: string) {
    super(message)
    this.name = 'ConnectorAlreadyBound'
    this.actualConnectorId = actualConnectorId
  }
}

export class ConnectorAuthenticationFailed extends Error {
  readonly _tag = 'ConnectorAuthenticationFailed' as const
  constructor(message: string) {
    super(message)
    this.name = 'ConnectorAuthenticationFailed'
  }
}

export class CommandTimeout extends Error {
  readonly _tag = 'CommandTimeout' as const
  readonly timeoutMs: number
  constructor(message: string, timeoutMs: number) {
    super(message)
    this.name = 'CommandTimeout'
    this.timeoutMs = timeoutMs
  }
}

export class CommandOutcomeUnknown extends Error {
  readonly _tag = 'CommandOutcomeUnknown' as const
  override readonly cause: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'CommandOutcomeUnknown'
    this.cause = cause
  }
}

export class CommandRejected extends Error {
  readonly _tag = 'CommandRejected' as const
  readonly code: string
  readonly details?: JsonValue
  constructor(payload: { code: string; message: string; details?: JsonValue }) {
    super(payload.message)
    this.name = 'CommandRejected'
    this.code = payload.code
    if (payload.details !== undefined) this.details = payload.details
  }
}

export class ProtocolFailure extends Error {
  readonly _tag = 'ProtocolFailure' as const
  override readonly cause: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ProtocolFailure'
    this.cause = cause
  }
}

export class ScreenshotFailure extends Error {
  readonly _tag = 'ScreenshotFailure' as const
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ScreenshotFailure'
    this.cause = cause
  }
}

export class ChromeUnavailable extends Error {
  readonly _tag = 'ChromeUnavailable' as const
  constructor(message: string) {
    super(message)
    this.name = 'ChromeUnavailable'
  }
}

export type BridgeFailure =
  | BridgeStopped
  | BridgeUnavailable
  | ConnectorNotBound
  | ConnectorOffline
  | CommandTimeout
  | CommandOutcomeUnknown
  | CommandRejected
  | ProtocolFailure

export const messageOf = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error)
