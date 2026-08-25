import { describe, expect, it } from 'vitest'
import {
  applyStatusPollFailure,
  applyStatusPollSuccess,
  chromeIdentityLines,
  classifyChromeStatus,
  needsReloadGuidance,
  offlineStatusHint,
  type ChromeStatusPayload,
} from '../src/client/chrome-status-view.ts'

const ready: ChromeStatusPayload = {
  state: 'ready',
  reloadRequired: false,
  error: null,
  health: {
    kernelProtocolVersion: 'kernel-v1',
    kernelBuildId: 'build-1',
    operationRevision: 'ops-1',
    kernel: 'listening',
    connector: 'polling',
    runtime: 'idle',
    connectorStatus: { label: 'Chrome test', connected: true, queuedCommands: 0, pendingCommands: 0 },
  },
}

describe('formal Chrome health view', () => {
  it('classifies connected, waiting, stale, mismatch, and offline', () => {
    expect(classifyChromeStatus(ready, false)).toBe('connected')
    expect(classifyChromeStatus({ ...ready, state: 'waiting-for-extension', health: { ...ready.health!, connector: 'absent' } }, false)).toBe('waiting')
    expect(classifyChromeStatus({ ...ready, health: { ...ready.health!, connector: 'stale' } }, false)).toBe('stale')
    expect(classifyChromeStatus({ ...ready, reloadRequired: true }, false)).toBe('mismatch')
    expect(classifyChromeStatus({ ...ready, state: 'offline', health: null, error: 'failed' }, false)).toBe('offline')
  })

  it('renders kernel and connector revision lines', () => {
    const lines = chromeIdentityLines(ready)
    expect(lines.expected?.displayVersion).toBe('build-1')
    expect(lines.live?.displayVersion).toBe('ops-1')
    expect(lines.live?.label).toBe('Chrome test')
  })

  it('only recommends reload for stale or mismatched kernels', () => {
    expect(needsReloadGuidance('mismatch')).toBe(true)
    expect(needsReloadGuidance('stale')).toBe(true)
    expect(needsReloadGuidance('waiting')).toBe(false)
  })

  it('clears stale payloads after a poll failure', () => {
    expect(applyStatusPollSuccess(ready)).toEqual({ status: ready, unknown: false })
    expect(applyStatusPollFailure()).toEqual({ status: null, unknown: true })
    expect(offlineStatusHint('bind failed', 'fallback')).toBe('bind failed')
  })
})
