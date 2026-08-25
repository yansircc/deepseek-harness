#!/usr/bin/env node

import { access, copyFile, mkdir, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const phase = process.argv[2]
const source = process.env.WORKTREECTL_SOURCE
const target = process.env.WORKTREECTL_PATH

if (source === undefined || target === undefined) {
  throw new Error('worktree lifecycle requires WORKTREECTL_SOURCE and WORKTREECTL_PATH')
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: target, stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status ?? result.signal)}`)
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function hydrate() {
  const candidates = ['.env']
  const copied = []
  for (const relative of candidates) {
    const from = join(source, relative)
    if (!await exists(from)) continue
    const to = join(target, relative)
    await mkdir(dirname(to), { recursive: true })
    await copyFile(from, to, constants.COPYFILE_EXCL)
    const info = await stat(to)
    copied.push({ source: relative, target: relative, mode: (info.mode & 0o777).toString(8), sensitive: true })
  }
  console.log(`WORKTREECTL_SUMMARY=${JSON.stringify({ copied })}`)
}

function bootstrap() {
  run('pnpm', ['install', '--offline', '--frozen-lockfile'])
}

function verify() {
  run('git', ['diff', '--exit-code', '--', '.'])
  run('pnpm', ['exec', 'tsx', '--version'])
}

function cleanup() {
  // pnpm's checkout-local links and caches are ignored and need no explicit teardown.
}

function residueCheck() {
  // This protocol owns no external process, container, database, or directory.
}

switch (phase) {
  case 'hydrate': await hydrate(); break
  case 'bootstrap': bootstrap(); break
  case 'verify': verify(); break
  case 'cleanup': cleanup(); break
  case 'residue-check': residueCheck(); break
  default: throw new Error(`unknown worktree lifecycle phase: ${String(phase)}`)
}
