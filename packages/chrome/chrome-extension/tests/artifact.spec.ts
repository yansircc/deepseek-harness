import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url).pathname

describe('authored Chrome extension artifact', () => {
  it('pins the DSH extension identity and generated evidence', async () => {
    const manifest = JSON.parse(await readFile(join(root, 'dist/browser-extension/manifest.json'), 'utf8')) as { version: string; background?: { service_worker?: string } }
    const evidence = JSON.parse(await readFile(join(root, 'dist/browser-extension/evidence.json'), 'utf8')) as { extensionId: string; displayVersion: string; protocolFingerprint: string }
    expect(manifest.version).toBe('0.5.3')
    expect(manifest.background?.service_worker).toBe('service-worker.js')
    expect(evidence.extensionId).toBe('ncikkhgopjmpkkcbgndgmolkfkiehlnm')
    expect(evidence.displayVersion).toBe(manifest.version)
    expect(evidence.protocolFingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  it('contains the repaired snapshot, console, and opaque wait implementation', async () => {
    const worker = await readFile(join(root, 'dist/browser-extension/service-worker.js'), 'utf8')
    expect(worker).toContain('installDshChromeInstrumentation')
    expect(worker).toContain('await snapshotPage')
    expect(worker).toContain('wait observations vary by condition kind')
  })
})
