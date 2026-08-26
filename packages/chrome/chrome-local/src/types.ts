/** Internal wire types for the local Chrome connector provider. */
import type {
  ChromeConnectorId,
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

/** Result retained after the caller stopped awaiting it. */
export interface LateResultRecord {
  readonly result: import('@deepseek-ai/dsh-chrome-protocol').WireResult
  readonly receivedAt: number
}
