import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))
const committed = join(root, 'dist/browser-extension')
const temporary = await mkdtemp(join(tmpdir(), 'dsh-chrome-freshness-'))
const generated = join(temporary, 'browser-extension')

const run = async (): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx/esm', 'scripts/build.ts', '--out-dir', generated], {
      cwd: root,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`Chrome extension build failed with ${signal ?? `exit ${String(code)}`}`))
    })
  })

const files = async (directory: string, prefix = ''): Promise<string[]> => {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true })
  const output: string[] = []
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) output.push(...await files(directory, path))
    else output.push(path)
  }
  return output.sort()
}

try {
  await run()
  const expected = await files(committed)
  const actual = await files(generated)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Generated artifact list drifted: committed=${expected.join(',')} generated=${actual.join(',')}`)
  }
  const drift: string[] = []
  for (const file of expected) {
    const [left, right] = await Promise.all([
      readFile(join(committed, file)),
      readFile(join(generated, file)),
    ])
    if (!left.equals(right)) drift.push(relative(root, join(committed, file)))
  }
  if (drift.length > 0) {
    throw new Error(`Generated Chrome extension artifacts are stale: ${drift.join(', ')}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
