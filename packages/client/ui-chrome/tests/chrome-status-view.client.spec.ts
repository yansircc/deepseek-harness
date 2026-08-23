import { describe, expect, it } from 'vitest'
import {
  applyStatusPollFailure,
  applyStatusPollSuccess,
  chromeIdentityLines,
  classifyChromeStatus,
  fingerprintPrefix,
  identitiesMatch,
  needsReloadGuidance,
  offlineStatusHint,
  type ChromeStatusPayload,
} from '../src/client/chrome-status-view.ts'

const expectation = {
  extensionId: 'ncikkhgopjmpkkcbgndgmolkfkiehlnm',
  displayVersion: '0.1.0-rc.8',
  protocolFingerprint: '593fb1f978e0ef1f0e3896f02cde26ac64ac647909a6c93aa7eb7fc4660cd501',
}

const matchingConnector = {
  extensionId: expectation.extensionId,
  extensionDisplayVersion: expectation.displayVersion,
  protocolFingerprint: expectation.protocolFingerprint,
  connected: true,
  label: 'Chrome local',
  queuedCommands: 0,
  pendingCommands: 0,
}

const payload = (
  overrides: Partial<ChromeStatusPayload>,
): ChromeStatusPayload => ({
  state: 'waiting-for-extension',
  url: 'http://127.0.0.1:17400',
  extensionExpectation: expectation,
  connector: null,
  error: null,
  ...overrides,
})

describe('offlineStatusHint', () => {
  it('prefers the host error when the payload includes one', () => {
    expect(offlineStatusHint(
      'BridgeUnavailable: Shared bridge listener did not prove owner credential possession',
      'fallback',
    )).toBe('BridgeUnavailable: Shared bridge listener did not prove owner credential possession')
  })

  it('uses the locale fallback when the host omitted an error', () => {
    expect(offlineStatusHint(null, 'fallback')).toBe('fallback')
    expect(offlineStatusHint('', 'fallback')).toBe('fallback')
  })
})

describe('fingerprintPrefix', () => {
  it('keeps the leading characters of a protocol fingerprint', () => {
    expect(fingerprintPrefix(expectation.protocolFingerprint)).toBe('593fb1f978e0')
  })
})

describe('identitiesMatch', () => {
  it('requires matching id, version, and fingerprint', () => {
    expect(identitiesMatch(expectation, matchingConnector)).toBe(true)
    expect(identitiesMatch(expectation, {
      ...matchingConnector,
      extensionDisplayVersion: '9.9.9',
    })).toBe(false)
  })
})

describe('classifyChromeStatus', () => {
  it('reports checking or unknown before a successful poll', () => {
    expect(classifyChromeStatus(null, false)).toBe('checking')
    expect(classifyChromeStatus(null, true)).toBe('unknown')
  })

  it('reports connected when the live connector matches the expectation', () => {
    expect(classifyChromeStatus(payload({
      state: 'ready',
      connector: matchingConnector,
    }), false)).toBe('connected')
  })

  it('reports waiting when the bridge is up without a connector', () => {
    expect(classifyChromeStatus(payload({ state: 'waiting-for-extension' }), false)).toBe('waiting')
  })

  it('reports stale when a connector is present but disconnected', () => {
    expect(classifyChromeStatus(payload({
      state: 'waiting-for-extension',
      connector: { ...matchingConnector, connected: false },
    }), false)).toBe('stale')
  })

  it('reports mismatch when the live identity differs from the expectation', () => {
    expect(classifyChromeStatus(payload({
      state: 'ready',
      connector: {
        ...matchingConnector,
        protocolFingerprint: 'aa'.repeat(32),
      },
    }), false)).toBe('mismatch')
  })

  it('reports offline and unconfigured from the host state', () => {
    expect(classifyChromeStatus(payload({
      state: 'offline',
      extensionExpectation: null,
      error: 'BridgeUnavailable: unreachable',
    }), false)).toBe('offline')
    expect(classifyChromeStatus(payload({
      state: 'unconfigured',
      extensionExpectation: null,
      error: 'Owner credential is not configured',
    }), false)).toBe('unconfigured')
  })
})

describe('chromeIdentityLines', () => {
  it('formats expected and live identity lines with a fingerprint prefix', () => {
    expect(chromeIdentityLines(null)).toEqual({ expected: null, live: null })
    expect(chromeIdentityLines(payload({
      state: 'ready',
      connector: matchingConnector,
    }))).toEqual({
      expected: {
        extensionId: expectation.extensionId,
        displayVersion: expectation.displayVersion,
        fingerprintPrefix: '593fb1f978e0',
      },
      live: {
        extensionId: matchingConnector.extensionId,
        displayVersion: matchingConnector.extensionDisplayVersion,
        fingerprintPrefix: '593fb1f978e0',
        label: 'Chrome local',
        connected: true,
      },
    })
  })
})

describe('needsReloadGuidance', () => {
  it('is true for waiting, stale, and mismatch only', () => {
    expect(needsReloadGuidance('waiting')).toBe(true)
    expect(needsReloadGuidance('stale')).toBe(true)
    expect(needsReloadGuidance('mismatch')).toBe(true)
    expect(needsReloadGuidance('connected')).toBe(false)
    expect(needsReloadGuidance('offline')).toBe(false)
  })
})

describe('applyStatusPollFailure', () => {
  it('clears a prior successful payload before marking unknown', () => {
    const prior = applyStatusPollSuccess(payload({
      state: 'ready',
      connector: matchingConnector,
    }))
    expect(prior.status).not.toBeNull()
    expect(prior.unknown).toBe(false)

    const failed = applyStatusPollFailure()
    expect(failed).toEqual({ status: null, unknown: true })
    expect(classifyChromeStatus(failed.status, failed.unknown)).toBe('unknown')
  })
})
