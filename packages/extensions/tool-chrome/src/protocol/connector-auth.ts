/**
 * Connector authentication headers and the extension public key. Pure data.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/connector-auth
 */

import auth from './connector-auth.json' with { type: 'json' }

/** SPKI RSA public key (base64 DER) that pins the signed Chrome extension package. */
export const EXTENSION_PUBLIC_KEY = auth.extensionPublicKey

/** HTTP header name for the connector id on authenticated connector requests. */
export const CONNECTOR_ID_HEADER = auth.headers.id
/** HTTP header name for the Chrome extension id that owns the connector. */
export const CONNECTOR_EXTENSION_ID_HEADER = auth.headers.extensionId
/** HTTP header name for the connector handshake client nonce. */
export const CONNECTOR_CLIENT_NONCE_HEADER = auth.headers.clientNonce
/** HTTP header name for the session `bridgeEpoch` the connector binds proofs to. */
export const CONNECTOR_BRIDGE_EPOCH_HEADER = auth.headers.bridgeEpoch
/** HTTP header name for the one-time request nonce issued to the connector. */
export const CONNECTOR_REQUEST_NONCE_HEADER = auth.headers.requestNonce
/** HTTP header name for the SHA-256 hex of the connector request body. */
export const CONNECTOR_BODY_SHA256_HEADER = auth.headers.bodySha256
/** HTTP header name for the connector HMAC request proof. */
export const CONNECTOR_PROOF_HEADER = auth.headers.proof
/** HTTP header name for the extension display version metadata. */
export const CONNECTOR_DISPLAY_VERSION_METADATA_HEADER = auth.metadataHeaders.displayVersion
/** HTTP header name for the connector's protocol-fingerprint hex metadata. */
export const CONNECTOR_PROTOCOL_FINGERPRINT_HEADER = auth.metadataHeaders.protocolFingerprint

/** Comma-separated Access-Control-Allow-Headers list for connector CORS preflight. */
export const CONNECTOR_REQUEST_HEADERS = [
  'content-type',
  CONNECTOR_ID_HEADER,
  CONNECTOR_EXTENSION_ID_HEADER,
  CONNECTOR_CLIENT_NONCE_HEADER,
  CONNECTOR_BRIDGE_EPOCH_HEADER,
  CONNECTOR_REQUEST_NONCE_HEADER,
  CONNECTOR_BODY_SHA256_HEADER,
  CONNECTOR_PROOF_HEADER,
  CONNECTOR_DISPLAY_VERSION_METADATA_HEADER,
  CONNECTOR_PROTOCOL_FINGERPRINT_HEADER,
].join(',')

/** chrome.storage key the extension uses to persist connector identity. */
export const CONNECTOR_STORAGE_KEY = auth.storageKey
