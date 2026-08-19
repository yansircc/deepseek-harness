/**
 * Chrome extension package identity: the extension id derived from the
 * packaged public key. Ported from the pi-chrome extension
 * (`src/pi/extension-package.ts`) with Effect replaced by plain functions.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/extension-package
 */

import { createHash, createPublicKey } from 'node:crypto'
import { EXTENSION_PUBLIC_KEY } from '../protocol/connector-auth.ts'

class ExtensionPublicKeyInvalid extends Error {
  override readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ExtensionPublicKeyInvalid'
    this.cause = cause
  }
}

const deriveExtensionPackageId = (encodedKey: string): string => {
  const publicKey = Buffer.from(encodedKey, 'base64')
  let parsed: ReturnType<typeof createPublicKey>
  try {
    parsed = createPublicKey({ key: publicKey, format: 'der', type: 'spki' })
  } catch (cause) {
    throw new ExtensionPublicKeyInvalid('Chrome extension public key must be valid SPKI', cause)
  }
  if (parsed.asymmetricKeyType !== 'rsa') {
    throw new ExtensionPublicKeyInvalid('Chrome extension public key must be RSA')
  }
  const alphabet = 'abcdefghijklmnop'
  return [...createHash('sha256').update(publicKey).digest().subarray(0, 16)]
    .map(byte => `${alphabet[byte >> 4]}${alphabet[byte & 0x0f]}`)
    .join('')
}

export const extensionPackageIdFromPublicKey = (encodedKey: string): string =>
  deriveExtensionPackageId(encodedKey)

export const EXTENSION_PACKAGE_ID = extensionPackageIdFromPublicKey(EXTENSION_PUBLIC_KEY)

/** The extension identity the bridge expects its connector to present. */
export const extensionExpectation = (
  displayVersion: string,
  protocolFingerprint: string,
): { extensionId: string; displayVersion: string; protocolFingerprint: string } => ({
  extensionId: EXTENSION_PACKAGE_ID,
  displayVersion,
  protocolFingerprint,
})
