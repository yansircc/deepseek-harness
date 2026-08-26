/** Build one immutable Chrome extension candidate and prove ZIP equivalence. */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const source = join(root, 'packages/chrome/chrome-extension/dist/browser-extension')
const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8')) as { version: string; key: string }
const evidence = JSON.parse(await readFile(join(source, 'evidence.json'), 'utf8')) as Record<string, unknown>
const serviceWorker = await readFile(join(source, 'service-worker.js'))
const kernelBuildId = createHash('sha256').update(serviceWorker).digest('hex').slice(0, 16)
const candidate = join(root, '.artifacts/chrome', kernelBuildId)
const unpacked = join(candidate, 'unpacked')
await rm(candidate, { recursive: true, force: true })
await mkdir(candidate, { recursive: true })
await cp(source, unpacked, { recursive: true })
const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat()
}
const hashes = Object.fromEntries((await walk(unpacked)).sort().map(file => [relative(unpacked, file), createHash('sha256').update(execFileSync('cat', [file])).digest('hex')]))
await writeFile(join(candidate, 'file-hashes.json'), `${JSON.stringify(hashes, null, 2)}\n`)
const zip = join(candidate, 'extension.zip')
execFileSync('ditto', ['-c', '-k', '--sequesterRsrc', unpacked, zip])
const verify = join(candidate, 'zip-expanded')
await mkdir(verify)
execFileSync('ditto', ['-x', '-k', zip, verify])
const verified = Object.fromEntries((await walk(verify)).sort().map(file => [relative(verify, file), createHash('sha256').update(execFileSync('cat', [file])).digest('hex')]))
if (JSON.stringify(hashes) !== JSON.stringify(verified)) throw new Error('ZIP contents differ from smoke candidate')
const proof = { gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), kernelBuildId, manifestVersion: manifest.version, ...evidence, files: hashes, zipSha256: createHash('sha256').update(await readFile(zip)).digest('hex'), smoke: { status: 'pending-chrome-for-testing' } }
await writeFile(join(candidate, 'evidence.json'), `${JSON.stringify(proof, null, 2)}\n`)
console.log(JSON.stringify({ candidate, zip, kernelBuildId, zipSha256: proof.zipSha256 }))
