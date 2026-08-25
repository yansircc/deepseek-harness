/** Watch Chrome operation and kernel sources while making reload requirements explicit. */
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const extension = resolve(root, 'packages/chrome/chrome-extension')
const statePath = resolve(extension, 'dist/browser-extension/dev-state.json')
const operationRoots = [
  resolve(root, 'packages/chrome/tool-chrome/src'),
  resolve(extension, 'src/browser/injected'),
]
const kernelRoots = [
  resolve(extension, 'src/browser/service-worker.ts'),
  resolve(extension, 'src/browser/connector-http.ts'),
  resolve(extension, 'src/browser/command-journal.ts'),
  resolve(extension, 'src/browser/manifest.json'),
  resolve(extension, 'src/protocol'),
]

const digest = (value: string): string => createHash('sha256').update(value).digest('hex').slice(0, 16)
const run = (command: string, args: string[]): Promise<void> => new Promise((fulfill, reject) => {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env })
  child.once('error', reject)
  child.once('exit', code => code === 0 ? fulfill() : reject(new Error(`${command} exited ${String(code)}`)))
})

let operationRevision = digest(String(Date.now()))
let kernelBuildId = 'unchanged'
let reloadRequired = false
let building = false
let queued: 'operation' | 'kernel' | undefined

async function publish(): Promise<void> {
  await writeFile(statePath, `${JSON.stringify({ kernelBuildId, operationRevision, reloadRequired }, null, 2)}\n`)
  console.log(`dev:chrome kernel=${kernelBuildId} operations=${operationRevision} reloadRequired=${String(reloadRequired)}`)
}

async function rebuild(kind: 'operation' | 'kernel'): Promise<void> {
  if (building) { queued = kind === 'kernel' ? 'kernel' : queued ?? 'operation'; return }
  building = true
  try {
    if (kind === 'kernel') {
      await run('pnpm', ['--filter', '@deepseek-ai/dsh-chrome-extension', 'run', 'build'])
      const worker = await readFile(resolve(extension, 'dist/browser-extension/service-worker.js'), 'utf8')
      kernelBuildId = digest(worker)
      reloadRequired = true
    } else {
      await run('pnpm', ['exec', 'tsc', '-b', 'packages/chrome/tool-chrome', '--pretty', 'false'])
      operationRevision = digest(`${Date.now()}:${operationRevision}`)
    }
    await publish()
  } catch (error) {
    console.error(`dev:chrome ${kind} rebuild failed`, error)
  } finally {
    building = false
    const next = queued
    queued = undefined
    if (next) void rebuild(next)
  }
}

for (const path of operationRoots) watch(path, { recursive: true }, () => { void rebuild('operation') })
for (const path of kernelRoots) watch(path, { recursive: true }, () => { void rebuild('kernel') })
await publish()
console.log('dev:chrome watching operation sources; kernel changes require one safe extension reload.')
await new Promise(() => {})
