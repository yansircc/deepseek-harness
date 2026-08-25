/**
 * Resolve and pin the Chrome bridge owner secret for one process.
 *
 * The listening bridge HMAC-signs owner routes with one key. A later
 * `credentials.resolve` that returns a different value would make every
 * owner status poll fail, so the first non-empty value is reused until
 * the process exits.
 *
 * @module @deepseek-ai/dsh-tool-chrome/owner-credential
 */

import { randomBytes } from 'node:crypto'

/** Current owner credential reference. */
export const OWNER_CREDENTIAL_REF = 'DSH_CHROME_OWNER_CREDENTIAL'

/**
 * Previous owner credential reference. Read only when {@link OWNER_CREDENTIAL_REF}
 * is empty so an existing secret is not replaced by a newly minted one.
 */
export const LEGACY_OWNER_CREDENTIAL_REF = 'PI_CHROME_OWNER_CREDENTIAL'

/** Lookup and optional persist face used to resolve the owner secret. */
export interface OwnerCredentialSource {
  /**
   * Resolve one credential reference to its current non-empty value.
   * @param ref - POSIX identifier stored or inherited as a credential name.
   * @returns the secret, or `undefined` when that name is unset.
   */
  resolve: (ref: string) => Promise<string | undefined>
  /**
   * Persist a secret under `ref` when the source is writable.
   * @param ref - credential name to write.
   * @param value - non-empty secret.
   */
  store?: (ref: string, value: string) => Promise<void>
}

const nonEmpty = (value: string | undefined): string | undefined =>
  value !== undefined && value.length > 0 ? value : undefined

/**
 * Resolve the owner secret from the current name, then the legacy name, then
 * the process environment under the same two names.
 * @param source - credential store (and optional write-back).
 * @param env - process environment used after the store.
 * @param currentRef - current credential name.
 * @param legacyRef - previous credential name; ignored when equal to `currentRef`.
 * @returns the first non-empty secret, or `undefined` when none is configured.
 */
export async function resolveOwnerSecret(
  source: OwnerCredentialSource,
  env: NodeJS.ProcessEnv,
  currentRef: string,
  legacyRef: string,
): Promise<string | undefined> {
  const current = nonEmpty(await source.resolve(currentRef))
  if (current !== undefined) return current
  const legacy = currentRef === legacyRef ? undefined : nonEmpty(await source.resolve(legacyRef))
  if (legacy !== undefined) {
    if (source.store !== undefined) {
      try {
        await source.store(currentRef, legacy)
      } catch {
        // Store rejected the write-back; the in-process pin still uses `legacy`.
      }
    }
    return legacy
  }
  const envCurrent = nonEmpty(env[currentRef])
  if (envCurrent !== undefined) return envCurrent
  if (currentRef === legacyRef) return undefined
  return nonEmpty(env[legacyRef])
}

/**
 * Pin the first successful load for the rest of the process.
 * @param load - async factory invoked at most once.
 * @returns a function that always returns the same pending or settled promise.
 */
export function pinOwnerSecret(load: () => Promise<string>): () => Promise<string> {
  let pending: Promise<string> | undefined
  return () => {
    pending ??= load()
    return pending
  }
}

/**
 * Mint a 64-character lowercase hex owner secret.
 * @returns 32 random bytes encoded as hex.
 */
export function mintOwnerSecret(): string {
  return randomBytes(32).toString('hex')
}
