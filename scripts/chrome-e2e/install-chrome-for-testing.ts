import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const pin = JSON.parse(await readFile(new URL('./chrome-for-testing.json', import.meta.url), 'utf8')) as {
  version: string
  url: string
  sha256: string
}
const root = join(process.cwd(), '.artifacts/chrome-for-testing', pin.version)
const archive = join(root, 'chrome.zip')
const expanded = join(root, 'expanded')
await mkdir(root, { recursive: true })
const bytes = execFileSync('curl', ['-fsSL', pin.url], { maxBuffer: 500 * 1024 * 1024 })
const actual = createHash('sha256').update(bytes).digest('hex')
if (actual !== pin.sha256) throw new Error(`Chrome for Testing checksum mismatch: ${actual}`)
await writeFile(archive, bytes)
await rm(expanded, { recursive: true, force: true })
await mkdir(expanded)
execFileSync('ditto', ['-x', '-k', archive, expanded])
console.log(join(expanded, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'))
