/** Internal wire types for the local Chrome connector provider. */
import type {
  ChromeCommand,
  ChromeCommandId,
  ChromeConnectorId,
  ChromeJsonValue,
} from '@deepseek-ai/dsh-chrome-protocol'

/** Public connector identity safe to expose in health. */
export interface PublicConnector {
  readonly connectorId: ChromeConnectorId
  readonly extensionId: string
  readonly extensionDisplayVersion: string
  readonly protocolFingerprint: string
  readonly label: string
}

/** Connector identity including the local HMAC secret. */
export interface ProfileConnector extends PublicConnector {
  readonly secret: string
}

/** Owner context carried to the extension for scoped tab ownership. */
export interface WireOwnerContext {
  readonly key: string
  readonly groupTitle: string
  readonly foreground: boolean
}

/** Command delivered to the Chrome extension. */
export interface WireCommand {
  readonly id: ChromeCommandId
  readonly command: ChromeCommand
  readonly owner: WireOwnerContext
}

/** Terminal connector failure. */
export type WireCommandError =
  | { readonly code: 'rejected'; readonly message: string; readonly details?: ChromeJsonValue }
  | { readonly code: 'outcome-unknown'; readonly message: string }
  | { readonly code: 'cancelled'; readonly message: string }

/** Result posted by the connector. */
export type WireResult =
  | { readonly id: ChromeCommandId; readonly ok: true; readonly value: ChromeJsonValue }
  | { readonly id: ChromeCommandId; readonly ok: false; readonly error: WireCommandError }

/** Connector long-poll response. */
export type PollResponse =
  | { readonly type: 'none' }
  | { readonly type: 'command'; readonly command: WireCommand }
  | { readonly type: 'cancel'; readonly commandId: ChromeCommandId }

/** Result retained after the caller stopped awaiting it. */
export interface LateResultRecord {
  readonly result: WireResult
  readonly receivedAt: number
}
