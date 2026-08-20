/**
 * Chrome extension package identity: the extension id derived from the
 * packaged public key. Ported from the pi-chrome extension
 * (`src/pi/extension-package.ts`) with Effect replaced by plain functions.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/extension-package
 */

import { createHash, createPublicKey } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
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

/**
 * Derive the Chrome extension id from a base64-encoded SPKI public key.
 * @param encodedKey - base64 SPKI bytes; must decode as RSA.
 * @returns the 32-character Chrome packed-app id.
 * @throws when the key is not valid RSA SPKI.
 */
export const extensionPackageIdFromPublicKey = (encodedKey: string): string =>
  deriveExtensionPackageId(encodedKey)

/** Packed Chrome extension id derived from the shipped `EXTENSION_PUBLIC_KEY`. */
export const EXTENSION_PACKAGE_ID = extensionPackageIdFromPublicKey(EXTENSION_PUBLIC_KEY)

/**
 * The protocol fingerprint the SHIPPED (prebuilt) Chrome extension speaks:
 * the pipee v1 fingerprint baked into `assets/browser-extension/`. The bridge
 * declares the same value so the connector handshake accepts the extension.
 * Once the extension is rebuilt from this codebase, the computed fingerprint
 * matches by construction and this override can be removed.
 */
export const EXTENSION_PROTOCOL_FINGERPRINT =
  '75eedfbca349aa6afc2fff680af4569711c118b95888a3d783927fb75dc52907'

const ASSETS_DIR = fileURLToPath(new URL('../../assets/browser-extension/', import.meta.url))

/**
 * Read the extension display version from the bundled manifest, so the
 * bridge's compatibility check (`extensionDisplayVersion === displayVersion`)
 * always agrees with the extension the user actually installs.
 * @returns `manifest.json` `version`, or `0.5.3` when the file is missing or has no version.
 */
export const extensionDisplayVersion = (): string => {
  try {
    const manifest = JSON.parse(
      readFileSync(join(ASSETS_DIR, 'manifest.json'), 'utf8'),
    ) as { version?: string }
    if (typeof manifest.version === 'string' && manifest.version.length > 0) {
      return manifest.version
    }
  } catch {
    // Unreadable or missing extension manifest; use the known shipped version.
  }
  return '0.5.3'
}

/**
 * The extension identity the bridge expects its connector to present.
 * @param displayVersion - human-facing extension version the connector must report.
 * @param protocolFingerprint - protocol hash the connector must report.
 * @returns identity triple compared during connector bind.
 */
export const extensionExpectation = (
  displayVersion: string,
  protocolFingerprint: string,
): { extensionId: string; displayVersion: string; protocolFingerprint: string } => ({
  extensionId: EXTENSION_PACKAGE_ID,
  displayVersion,
  protocolFingerprint,
})
