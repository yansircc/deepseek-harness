/** Map formal Chrome health onto the settings card. */
export interface ChromeHealthPayload {
  kernelProtocolVersion: string
  kernelBuildId: string
  operationRevision: string
  kernel: 'starting' | 'listening' | 'failed' | 'stopped'
  connector: 'absent' | 'handshaking' | 'polling' | 'stale'
  runtime: 'idle' | 'executing' | 'faulted'
  connectorStatus?: {
    label: string
    connected: boolean
    lastSeenAt?: number
    queuedCommands: number
    pendingCommands: number
  }
  currentCommand?: { phase: string; operation: string }
  lastFailure?: { code: string; message: string }
}

/** Host status payload the card polls. */
export interface ChromeStatusPayload {
  state: 'ready' | 'waiting-for-extension' | 'offline' | 'unconfigured'
  health: ChromeHealthPayload | null
  reloadRequired: boolean
  error: string | null
}

/** Connection classification rendered by the card. */
export type ChromeStatusKind =
  | 'checking' | 'unknown' | 'connected' | 'waiting' | 'stale' | 'mismatch' | 'offline' | 'unconfigured'

/** Compatibility display fields retained by the card renderer. */
export interface ChromeIdentityLine {
  extensionId: string
  displayVersion: string
  fingerprintPrefix: string
  label?: string
  connected?: boolean
}

export const FINGERPRINT_PREFIX_LENGTH = 12
/** Return a bounded revision prefix. */
export const fingerprintPrefix = (value: string, length = FINGERPRINT_PREFIX_LENGTH): string => value.slice(0, length)

/** Classify formal health plus poll state. */
export function classifyChromeStatus(status: ChromeStatusPayload | null, unknown: boolean): ChromeStatusKind {
  if (status === null) return unknown ? 'unknown' : 'checking'
  if (status.state === 'offline') return 'offline'
  if (status.state === 'unconfigured') return 'unconfigured'
  if (status.reloadRequired) return 'mismatch'
  if (status.health?.connector === 'stale') return 'stale'
  if (status.state === 'ready' && status.health?.connector === 'polling') return 'connected'
  return 'waiting'
}

/** Project kernel revision and connector label onto legacy identity rows. */
export function chromeIdentityLines(status: ChromeStatusPayload | null): {
  expected: ChromeIdentityLine | null
  live: ChromeIdentityLine | null
} {
  const health = status?.health
  if (health === null || health === undefined) return { expected: null, live: null }
  const expected = {
    extensionId: 'DSH kernel',
    displayVersion: health.kernelBuildId,
    fingerprintPrefix: fingerprintPrefix(health.kernelProtocolVersion),
  }
  const connector = health.connectorStatus
  return {
    expected,
    live: connector === undefined ? null : {
      extensionId: 'DSH connector',
      displayVersion: health.operationRevision,
      fingerprintPrefix: fingerprintPrefix(health.kernelProtocolVersion),
      label: connector.label,
      connected: connector.connected,
    },
  }
}

/** Whether the card should present extension reload guidance. */
export function needsReloadGuidance(kind: ChromeStatusKind): boolean {
  return kind === 'mismatch' || kind === 'stale'
}
/** Prefer a concrete host failure over generic locale text. */
export function offlineStatusHint(error: string | null, fallback: string): string {
  return error !== null && error.length > 0 ? error : fallback
}
export type BridgeStatusPollState = { status: ChromeStatusPayload | null; unknown: boolean }
/** Apply one successful health poll. */
export const applyStatusPollSuccess = (status: ChromeStatusPayload): BridgeStatusPollState => ({ status, unknown: false })
/** Clear stale success after a failed poll. */
export const applyStatusPollFailure = (): BridgeStatusPollState => ({ status: null, unknown: true })
