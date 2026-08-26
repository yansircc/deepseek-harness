import { describe, expect, it } from 'vitest'
import {
  EXTENSION_BUILD_GRAPH,
  expectedExtensionOutputs,
  renderExtensionManifest,
  validateBuildGraph,
} from '../scripts/extension-build-graph.ts'
import connectorAuth from '../src/protocol/connector-auth.json' with { type: 'json' }

const fingerprint = 'ab'.repeat(32)

const sourceManifest = {
  manifest_version: 3,
  name: 'DSH Chrome Connector',
  permissions: ['tabs'],
  action: { default_title: 'DSH Chrome Connector' },
}

describe('Chrome extension build graph', () => {
  it('owns every generated browser artifact exactly once', () => {
    expect(() =>{  validateBuildGraph() }).not.toThrow()
    expect([...expectedExtensionOutputs()].sort()).toEqual([
      'evidence.json',
      'manifest.json',
      'popup.css',
      'popup.html',
      'popup.js',
      'service-worker.js',
      'snapshot.js',
    ])
  })

  it('keeps the numeric extension version independent of the DSH package version', () => {
    const manifest = renderExtensionManifest(sourceManifest, {
      extensionVersion: '0.5.3',
      publicKey: connectorAuth.extensionPublicKey,
      protocolFingerprint: fingerprint,
    })
    expect(manifest.version).toBe('0.5.3')
    expect(manifest.minimum_chrome_version).toBe(String(EXTENSION_BUILD_GRAPH.minimumChromeVersion))
    expect((manifest.background as { service_worker: string }).service_worker).toBe('service-worker.js')
    expect((manifest.action as { default_popup: string }).default_popup).toBe('popup.html')
  })

  it('rejects nonnumeric Chrome versions before writing an artifact', () => {
    expect(() => renderExtensionManifest(sourceManifest, {
      extensionVersion: '0.1.1-rc.2',
      publicKey: connectorAuth.extensionPublicKey,
      protocolFingerprint: fingerprint,
    })).toThrow(/Chrome numeric extension version/)
  })
})
