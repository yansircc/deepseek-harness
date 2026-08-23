/**
 * Map the host Chrome status payload onto the card's status line.
 *
 * @module @deepseek-ai/dsh-client-ui-chrome/client/chrome-status-view
 */

/** Extension identity the bridge requires of a connector. */
export interface ChromeExtensionExpectation {
  extensionId: string
  displayVersion: string
  protocolFingerprint: string
}

/**
 * Public connector summary from `/api/chrome/status`.
 * No connector id or shared secret.
 */
export interface ChromeConnectorSummary {
  extensionId: string
  extensionDisplayVersion: string
  protocolFingerprint: string
  connected: boolean
  label: string
  lastSeenAt?: number
  queuedCommands?: number
  pendingCommands?: number
}

/** Host status payload the card polls from `/api/chrome/status`. */
export interface ChromeStatusPayload {
  /** ready = extension connected; waiting-for-extension = bridge up, no connector yet. */
  state: 'ready' | 'waiting-for-extension' | 'offline' | 'unconfigured'
  /** Bridge origin the host used for the owner fetch. */
  url: string
  /** Expected extension identity, or `null` when the host could not read it. */
  extensionExpectation: ChromeExtensionExpectation | null
  /** Live or last-reported connector summary, or `null` when none is bound. */
  connector: ChromeConnectorSummary | null
  /** Owner-fetch failure text when `state` is `offline` or `unconfigured`. */
  error: string | null
}

/** Connection classification the card maps to copy and the status dot. */
export type ChromeStatusKind =
  | 'checking'
  | 'unknown'
  | 'connected'
  | 'waiting'
  | 'stale'
  | 'mismatch'
  | 'offline'
  | 'unconfigured'

/** Display fields for the expected or live extension identity. */
export interface ChromeIdentityLine {
  extensionId: string
  displayVersion: string
  fingerprintPrefix: string
  label?: string
  connected?: boolean
}

/** Default hex prefix length shown for protocol fingerprints. */
export const FINGERPRINT_PREFIX_LENGTH = 12

/**
 * Truncate a protocol fingerprint for display.
 * @param fingerprint - full fingerprint hex from the host payload.
 * @param length - character count to keep; defaults to {@link FINGERPRINT_PREFIX_LENGTH}.
 * @returns the leading characters of `fingerprint`.
 */
export function fingerprintPrefix(
  fingerprint: string,
  length: number = FINGERPRINT_PREFIX_LENGTH,
): string {
  return fingerprint.slice(0, length)
}

/**
 * Whether the live connector presents the same identity the bridge expects.
 * @param expectation - bridge-required extension id, version, and fingerprint.
 * @param connector - public connector summary from the status payload.
 * @returns true when all three identity fields match.
 */
export function identitiesMatch(
  expectation: ChromeExtensionExpectation,
  connector: ChromeConnectorSummary,
): boolean {
  return (
    connector.extensionId === expectation.extensionId
    && connector.extensionDisplayVersion === expectation.displayVersion
    && connector.protocolFingerprint === expectation.protocolFingerprint
  )
}

/**
 * Classify the polled host payload for the status row.
 * @param status - latest `/api/chrome/status` body, or `null` before the first success.
 * @param unknown - true when the last poll failed (outdated host or network).
 * @returns the kind the card maps to locale copy and the status dot.
 */
export function classifyChromeStatus(
  status: ChromeStatusPayload | null,
  unknown: boolean,
): ChromeStatusKind {
  if (status === null) return unknown ? 'unknown' : 'checking'
  if (status.state === 'offline') return 'offline'
  if (status.state === 'unconfigured') return 'unconfigured'

  const { connector, extensionExpectation } = status
  if (
    connector !== null
    && extensionExpectation !== null
    && !identitiesMatch(extensionExpectation, connector)
  ) {
    return 'mismatch'
  }
  if (connector !== null && !connector.connected) return 'stale'
  if (status.state === 'ready' && connector !== null && connector.connected) return 'connected'
  return 'waiting'
}

/**
 * Expected and live identity lines the card may render under the status row.
 * @param status - latest host status payload, or `null` while checking.
 * @returns display lines; either side is `null` when that identity is absent.
 */
export function chromeIdentityLines(status: ChromeStatusPayload | null): {
  expected: ChromeIdentityLine | null
  live: ChromeIdentityLine | null
} {
  if (status === null) return { expected: null, live: null }
  const expected = status.extensionExpectation === null
    ? null
    : {
      extensionId: status.extensionExpectation.extensionId,
      displayVersion: status.extensionExpectation.displayVersion,
      fingerprintPrefix: fingerprintPrefix(status.extensionExpectation.protocolFingerprint),
    }
  const live = status.connector === null
    ? null
    : {
      extensionId: status.connector.extensionId,
      displayVersion: status.connector.extensionDisplayVersion,
      fingerprintPrefix: fingerprintPrefix(status.connector.protocolFingerprint),
      label: status.connector.label,
      connected: status.connector.connected,
    }
  return { expected, live }
}

/**
 * Whether the operator should reload the unpacked extension from chrome://extensions.
 * @param kind - classification from {@link classifyChromeStatus}.
 * @returns true for waiting, stale-disconnected, and identity-mismatch states.
 */
export function needsReloadGuidance(kind: ChromeStatusKind): boolean {
  return kind === 'waiting' || kind === 'stale' || kind === 'mismatch'
}

/**
 * Hint under the offline label. Prefer the host error; fall back to locale copy.
 * @param error - `error` field from the host status payload.
 * @param fallback - locale string used when the host omitted an error.
 * @returns the line the card renders under the offline status label.
 */
export function offlineStatusHint(error: string | null, fallback: string): string {
  return error !== null && error.length > 0 ? error : fallback
}

/** Result of applying one status-route poll to the card's local state. */
export type BridgeStatusPollState = {
  status: ChromeStatusPayload | null
  unknown: boolean
}

/**
 * Apply a successful `/api/chrome/status` poll.
 * @param data - parsed host status payload.
 * @returns connected-capable card state with `unknown` cleared.
 */
export function applyStatusPollSuccess(data: ChromeStatusPayload): BridgeStatusPollState {
  return { status: data, unknown: false }
}

/**
 * Apply a failed status-route poll.
 * Clears any prior successful payload so the card does not keep showing connected.
 * @returns checking/unknown card state with status cleared.
 */
export function applyStatusPollFailure(): BridgeStatusPollState {
  return { status: null, unknown: true }
}
