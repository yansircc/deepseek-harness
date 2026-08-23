/**
 * Packaged asset path: source and built entrypoints must resolve
 * `assets/browser-extension/` inside this package, not the extensions group.
 */
import { existsSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EXTENSION_ASSETS_DIR } from '../src/extension-assets.ts'
import {
  EXTENSION_PROTOCOL_FINGERPRINT,
  readExtensionEvidence,
} from '../src/bridge/extension-package.ts'
import { assetsReady, buildExtensionZip } from '../src/bridge/extension-download.ts'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const expectedAssets = join(packageRoot, 'assets', 'browser-extension')

describe('packaged Chrome extension assets', () => {
  it('resolves EXTENSION_ASSETS_DIR under tool-chrome, not packages/extensions/assets', () => {
    expect(EXTENSION_ASSETS_DIR.replace(/\/$/, '')).toBe(expectedAssets)
    expect(EXTENSION_ASSETS_DIR.split(sep)).toContain('tool-chrome')
    expect(EXTENSION_ASSETS_DIR).not.toMatch(/extensions[/\\]assets[/\\]browser-extension/)
    expect(existsSync(join(EXTENSION_ASSETS_DIR, 'evidence.json'))).toBe(true)
    expect(existsSync(join(EXTENSION_ASSETS_DIR, 'manifest.json'))).toBe(true)
  })

  it('reads evidence and builds a zip from the package assets directory', async () => {
    const evidence = readExtensionEvidence()
    expect(evidence.protocolFingerprint).toBe(EXTENSION_PROTOCOL_FINGERPRINT)
    expect(await assetsReady()).toBe(true)
    const zip = await buildExtensionZip(17401)
    expect(zip.byteLength).toBeGreaterThan(100)
  })

  it('keeps the packaged relative URL one level above the emitting module', () => {
    // Source module lives at src/extension-assets.ts; the bundle emits lib/index.js.
    // Both require `../assets/browser-extension/` relative to import.meta.url.
    const fromLib = fileURLToPath(new URL(
      '../assets/browser-extension/',
      pathToFileURL(join(packageRoot, 'lib', 'index.js')),
    )).replace(/\/$/, '')
    expect(fromLib).toBe(expectedAssets)
    const fromNestedBridge = fileURLToPath(new URL(
      '../../assets/browser-extension/',
      pathToFileURL(join(packageRoot, 'lib', 'index.js')),
    ))
    expect(fromNestedBridge).toContain(`${sep}extensions${sep}assets${sep}`)
    expect(fromNestedBridge).not.toContain(`${sep}tool-chrome${sep}assets${sep}`)
  })
})
