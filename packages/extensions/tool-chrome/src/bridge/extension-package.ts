/**
 * Chrome extension package identity: the extension id derived from the
 * packaged public key, plus the shipped protocol fingerprint pin from
 * `assets/browser-extension/evidence.json`.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/extension-package
 */

import { createHash, createPublicKey } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXTENSION_ASSETS_DIR } from '../extension-assets.ts'
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

type ExtensionEvidence = {
  extensionId: string
  displayVersion: string
  protocolFingerprint: string
}

/**
 * Read packaged extension evidence (id, display version, protocol fingerprint pin).
 * @returns parsed `evidence.json`; missing or invalid files throw.
 */
export const readExtensionEvidence = (): ExtensionEvidence => {
  const evidence = JSON.parse(
    readFileSync(join(EXTENSION_ASSETS_DIR, 'evidence.json'), 'utf8'),
  ) as Partial<ExtensionEvidence>
  if (
    typeof evidence.extensionId !== 'string'
    || typeof evidence.displayVersion !== 'string'
    || typeof evidence.protocolFingerprint !== 'string'
    || !/^[0-9a-f]{64}$/.test(evidence.protocolFingerprint)
  ) {
    throw new Error(
      'assets/browser-extension/evidence.json must pin extensionId, displayVersion, and a 64-hex protocolFingerprint',
    )
  }
  return {
    extensionId: evidence.extensionId,
    displayVersion: evidence.displayVersion,
    protocolFingerprint: evidence.protocolFingerprint,
  }
}

/**
 * Shipped protocol fingerprint pin from packaged `evidence.json`.
 * Drift gates assert this equals `protocolFingerprint()` and every bundled
 * extension literal; old extensions fail closed after a contract change.
 */
export const EXTENSION_PROTOCOL_FINGERPRINT = readExtensionEvidence().protocolFingerprint

/**
 * Read the extension display version from the bundled manifest, so the
 * bridge's compatibility check (`extensionDisplayVersion === displayVersion`)
 * always agrees with the extension the user actually installs.
 * @returns `manifest.json` `version`, or the evidence display version when missing.
 */
export const extensionDisplayVersion = (): string => {
  try {
    const manifest = JSON.parse(
      readFileSync(join(EXTENSION_ASSETS_DIR, 'manifest.json'), 'utf8'),
    ) as { version?: string }
    if (typeof manifest.version === 'string' && manifest.version.length > 0) {
      return manifest.version
    }
  } catch {
    // Unreadable or missing extension manifest; use packaged evidence.
  }
  return readExtensionEvidence().displayVersion
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
