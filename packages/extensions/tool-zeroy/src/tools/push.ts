/**
 * `zeroy_push` tool: upload objects, create SiteCommits, and publish
 * PreviewReleases via the zeroY Connector.
 *
 * Ported from the Pi adapter's `pushTool` (checkout-tools.ts lines 1313–1750).
 * All Effect-TS patterns are replaced with async/await; Node.js built-ins
 * (`fs/promises`, `child_process.spawn`, `path`, `crypto`) are used directly.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/tools/push
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import nodePath from 'node:path'

import {
  PushProviderProjection,
  decodePushInput,
  CHECKOUT_PROMPT_GUIDELINES,
} from '../domain/protocol.ts'
import { resolveConnection, getMutationGate } from '../session.ts'
import {
  connectorGet,
  connectorPost,
  ZeroYConnectorError,
  type JsonRecord,
} from '../domain/client.ts'
import {
  blobHash,
  canonicalJsonDocument,
  checkoutPathIsSafe,
  commitHash,
  decodeSiteCommit,
  normalizeCheckoutText,
  pushRequestHash,
  treeBytes,
  treeHash,
  type ObjectHash,
  type SiteCommit,
  type SiteObjectResult,
  type SiteTreeEntry,
} from '../domain/site-objects.ts'
import {
  decodeJsonDocument,
  encodeJsonDocument,
  incompleteMergeConflictKind,
  isMergeableTextPath,
  mergeJsonDocuments,
  normalizedTextBytes,
  type MergeConflict,
} from '../domain/site-merge.ts'
import { validateWorkspaceDocuments } from '../domain/workspace-validator.ts'
import { verifyBrowserChallenge } from '../domain/browser-verifier.ts'

// ---------------------------------------------------------------------------
// Tool description
// ---------------------------------------------------------------------------

const PUSH_DESCRIPTION =
  'Upload content-addressed objects and publish one SiteCommit as a PreviewRelease. '
  + CHECKOUT_PROMPT_GUIDELINES

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type CheckoutDescriptor = {
  readonly contract: 'zeroy/checkout@1'
  readonly siteId: string
  readonly checkoutId: string
  readonly remoteRef: string
  readonly observedCommit: ObjectHash | null
  readonly expectedRefCommit: ObjectHash | null
  readonly baseReleaseId: string | null
  readonly materializedAt: string
}

type StoredObject = {
  readonly objectHash: ObjectHash
  readonly objectType: 'blob' | 'tree'
  readonly bytes: Uint8Array
}

type PendingPush = {
  readonly contract: 'zeroy/pending-push@3'
  readonly commandId: string
  readonly requestHash: string
  readonly commitHash: ObjectHash
  readonly commit: SiteCommit
  readonly expectedCommit: ObjectHash | null
  readonly rootTree: ObjectHash
  readonly message: string
  readonly changeSummary: {
    readonly changedPathCount: number
    readonly changedSubjectCount: number
    readonly uploadedObjectCount: number
    readonly uploadedBytes: number
  }
}

type CheckoutManifestFile = {
  readonly path: string
  readonly hash: ObjectHash
  readonly mode: 'file' | 'executable'
}

type CheckoutManifest = {
  readonly commit: ObjectHash
  readonly baseReleaseId: string | null
  readonly files: ReadonlyMap<string, CheckoutManifestFile>
}

type TreeNode = {
  directories: Map<string, TreeNode>
  files: Map<string, { bytes: Uint8Array; mode: 'file' | 'executable' }>
}

// ---------------------------------------------------------------------------
// Helpers — decoders
// ---------------------------------------------------------------------------

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const hasExactKeys = (value: JsonRecord, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function decodeCheckoutDescriptor(value: unknown): CheckoutDescriptor | null {
  const descriptor = asRecord(value)
  if (
    descriptor === null
    || !hasExactKeys(descriptor, [
      'contract', 'siteId', 'checkoutId', 'remoteRef',
      'observedCommit', 'expectedRefCommit', 'baseReleaseId', 'materializedAt',
    ])
    || descriptor.contract !== 'zeroy/checkout@1'
    || typeof descriptor.siteId !== 'string'
    || descriptor.siteId.length === 0
    || typeof descriptor.checkoutId !== 'string'
    || descriptor.checkoutId.length === 0
    || typeof descriptor.remoteRef !== 'string'
    || !/^refs\/drafts\/[a-zA-Z0-9._@-]+\/[a-zA-Z0-9-]+$/.test(descriptor.remoteRef)
    || (descriptor.observedCommit !== null
      && (typeof descriptor.observedCommit !== 'string'
        || !/^sha256:[a-f0-9]{64}$/.test(descriptor.observedCommit)))
    || (descriptor.expectedRefCommit !== null
      && (typeof descriptor.expectedRefCommit !== 'string'
        || !/^sha256:[a-f0-9]{64}$/.test(descriptor.expectedRefCommit)))
    || (descriptor.baseReleaseId !== null && typeof descriptor.baseReleaseId !== 'string')
    || typeof descriptor.materializedAt !== 'string'
    || !Number.isFinite(Date.parse(descriptor.materializedAt))
  ) {
    return null
  }
  return descriptor as CheckoutDescriptor
}

function decodePendingPush(value: unknown): PendingPush | null {
  const pending = asRecord(value)
  if (
    pending === null
    || !hasExactKeys(pending, [
      'contract', 'commandId', 'requestHash', 'commitHash',
      'commit', 'expectedCommit', 'rootTree', 'message', 'changeSummary',
    ])
    || pending.contract !== 'zeroy/pending-push@3'
    || typeof pending.commandId !== 'string'
    || !/^[a-f0-9-]{36}$/.test(pending.commandId)
    || typeof pending.requestHash !== 'string'
    || !/^[a-f0-9]{64}$/.test(pending.requestHash)
    || typeof pending.commitHash !== 'string'
    || !/^sha256:[a-f0-9]{64}$/.test(pending.commitHash)
    || (pending.expectedCommit !== null
      && (typeof pending.expectedCommit !== 'string'
        || !/^sha256:[a-f0-9]{64}$/.test(pending.expectedCommit)))
    || typeof pending.rootTree !== 'string'
    || !/^sha256:[a-f0-9]{64}$/.test(pending.rootTree)
    || typeof pending.message !== 'string'
  ) {
    return null
  }
  const summary = asRecord(pending.changeSummary)
  const decodedCommit = decodeSiteCommit(pending.commit)
  if (decodedCommit._tag === 'Failure') return null
  const actualCommitHash = commitHash(decodedCommit.value)
  if (
    actualCommitHash._tag === 'Failure'
    || actualCommitHash.value !== pending.commitHash
    || decodedCommit.value.tree !== pending.rootTree
    || summary === null
    || !hasExactKeys(summary, [
      'changedPathCount', 'changedSubjectCount', 'uploadedObjectCount', 'uploadedBytes',
    ])
    || Object.values(summary).some(count => !Number.isSafeInteger(count) || (count as number) < 0)
  ) {
    return null
  }
  return pending as PendingPush
}

function decodeCheckoutManifest(payload: JsonRecord): CheckoutManifest | null {
  const commit = typeof payload.commit === 'string' ? payload.commit : ''
  if (!/^sha256:[a-f0-9]{64}$/.test(commit) || !Array.isArray(payload.files)) return null
  const files = new Map<string, CheckoutManifestFile>()
  for (const value of payload.files) {
    const item = asRecord(value)
    const relative = item && typeof item.path === 'string' ? item.path : ''
    const hash = item && typeof item.hash === 'string' ? item.hash : ''
    const mode = item?.mode
    if (
      !checkoutPathIsSafe(relative)
      || !/^sha256:[a-f0-9]{64}$/.test(hash)
      || (mode !== 'file' && mode !== 'executable')
      || files.has(relative)
    )
      return null
    files.set(relative, {
      path: relative,
      hash: hash as ObjectHash,
      mode,
    })
  }
  return {
    commit: commit as ObjectHash,
    baseReleaseId: typeof payload.baseReleaseId === 'string' ? payload.baseReleaseId : null,
    files,
  }
}

// ---------------------------------------------------------------------------
// Helpers — filesystem & JSON
// ---------------------------------------------------------------------------

const descriptorFile = (root: string): string => nodePath.join(root, '.zeroy', 'checkout.json')
const pendingFile = (root: string): string => nodePath.join(root, '.zeroy', 'pending-push.json')
const conflictsFile = (root: string): string => nodePath.join(root, '.zeroy', 'conflicts.json')

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(nodePath.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
}

async function readOptionalFile(file: string): Promise<Uint8Array | null> {
  try {
    return await fs.readFile(file)
  } catch {
    return null
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Helpers — shell commands
// ---------------------------------------------------------------------------

function runCommand(cwd: string, command: string, args: readonly string[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let error = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => { error += chunk })
    child.once('error', cause =>
      reject(new ZeroYConnectorError({ message: `${command} ${args[0] ?? ''} failed: ${String(cause)}` })))
    child.once('exit', code =>
      code === 0
        ? resolve()
        : reject(new ZeroYConnectorError({ message: `${command} ${args[0] ?? ''} failed: ${error.trim()}` })))
  })
}

function runCommandOutput(cwd: string, command: string, args: readonly string[]): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    let error = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { output += chunk })
    child.stderr.on('data', (chunk: string) => { error += chunk })
    child.once('error', cause =>
      reject(new ZeroYConnectorError({ message: `${command} ${args[0] ?? ''} failed: ${String(cause)}` })))
    child.once('exit', code =>
      code === 0
        ? resolve(output)
        : reject(new ZeroYConnectorError({ message: `${command} ${args[0] ?? ''} failed: ${error.trim()}` })))
  })
}

function runCommandStatus(
  cwd: string,
  command: string,
  args: readonly string[],
): Promise<{ readonly code: number; readonly error: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let error = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => { error += chunk })
    child.once('error', cause =>
      reject(new ZeroYConnectorError({ message: `${command} ${args[0] ?? ''} failed: ${String(cause)}` })))
    child.once('exit', code => resolve({ code: code ?? 1, error: error.trim() }))
  })
}

const runGit = (cwd: string, args: readonly string[]): Promise<void> => runCommand(cwd, 'git', args)

// ---------------------------------------------------------------------------
// Helpers — Git refs
// ---------------------------------------------------------------------------

const zeroYCommitGitRef = (commit: ObjectHash): string =>
  `refs/zeroy/commits/${commit.slice('sha256:'.length)}`

const zeroYRemoteGitRef = (remoteRef: string): string =>
  `refs/zeroy/remote/${remoteRef.replace(/^refs\//, '')}`

async function mapZeroYGitRefs(
  root: string,
  commit: ObjectHash,
  remoteRef: string,
  gitCommit: string,
): Promise<void> {
  await Promise.all([
    runGit(root, ['update-ref', zeroYCommitGitRef(commit), gitCommit]),
    runGit(root, ['update-ref', zeroYRemoteGitRef(remoteRef), gitCommit]),
  ])
}

async function recordLocalZeroYGitCommit(
  root: string,
  message: string,
  commit: ObjectHash,
  tree: ObjectHash,
  baseReleaseId: string | null,
): Promise<string> {
  await runGit(root, ['add', '--all'])
  await runGit(root, [
    '-c', 'user.name=zeroY',
    '-c', 'user.email=zeroy@local',
    'commit', '--allow-empty',
    '-m', `${message}\n\nzeroY-Commit: ${commit}\nzeroY-Tree: ${tree}\nzeroY-Base-Release: ${baseReleaseId ?? 'none'}`,
  ])
  const head = (await runCommandOutput(root, 'git', ['rev-parse', 'HEAD'])).trim()
  await runGit(root, ['update-ref', zeroYCommitGitRef(commit), head])
  return head
}

// ---------------------------------------------------------------------------
// Helpers — git changed paths
// ---------------------------------------------------------------------------

async function gitChangedPaths(root: string): Promise<string[]> {
  const [tracked, untracked] = await Promise.all([
    runCommandOutput(root, 'git', ['diff', '--name-only', '--no-renames', '-z', 'HEAD', '--']),
    runCommandOutput(root, 'git', ['ls-files', '--others', '--exclude-standard', '-z']),
  ])
  return [...new Set(`${tracked}\0${untracked}`.split('\0'))]
    .filter(relative => relative.length > 0)
    .filter(relative => relative !== '.zeroy/checkout.json' && !relative.startsWith('.zeroy/'))
    .sort()
}

// ---------------------------------------------------------------------------
// Helpers — finish pending rebase
// ---------------------------------------------------------------------------

async function finishPendingGitRebase(root: string, observedCommit: ObjectHash | null): Promise<void> {
  const gitDirectory = nodePath.join(root, '.git')
  const inProgress =
    (await fileExists(nodePath.join(gitDirectory, 'rebase-merge')))
    || (await fileExists(nodePath.join(gitDirectory, 'rebase-apply')))
  if (!inProgress) return
  if (observedCommit === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_base_missing',
      message: 'Git rebase is in progress but checkout has no observed zeroY commit.',
    })
  }
  await runGit(root, ['add', '--all'])
  await runGit(root, ['-c', 'core.editor=true', 'rebase', '--continue'])
  const remoteGit = (await runCommandOutput(root, 'git', [
    'rev-parse', '--verify', zeroYCommitGitRef(observedCommit),
  ])).trim()
  await runGit(root, ['reset', '--mixed', remoteGit])
}

// ---------------------------------------------------------------------------
// Helpers — scan checkout
// ---------------------------------------------------------------------------

function normalizedFileBytes(relative: string, bytes: Uint8Array): Uint8Array {
  const lower = relative.toLowerCase()
  if (lower.endsWith('.json')) {
    const result = canonicalJsonDocument(new TextDecoder().decode(bytes))
    if (result._tag === 'Failure') {
      throw new ZeroYConnectorError({
        code: `zeroy_${result.error.code}`,
        message: result.error.message,
      })
    }
    return result.value
  }
  if (
    ['.php', '.css', '.js', '.mjs', '.cjs', '.html', '.md', '.txt', '.svg'].some(ext =>
      lower.endsWith(ext))
  ) {
    return new TextEncoder().encode(normalizeCheckoutText(new TextDecoder().decode(bytes)))
  }
  return bytes
}

const treeNode = (): TreeNode => ({ directories: new Map(), files: new Map() })

async function scanCheckout(
  root: string,
): Promise<{ rootTree: ObjectHash; objects: Map<ObjectHash, StoredObject>; paths: string[] }> {
  const tree = treeNode()
  const paths: string[] = []

  const visit = async (directory: string, relativeRoot: string): Promise<void> => {
    const names = (await fs.readdir(directory)).sort()
    for (const name of names) {
      if (relativeRoot === '' && (name === '.git' || name === '.zeroy')) continue
      const relative = relativeRoot === '' ? name : `${relativeRoot}/${name}`
      if (!checkoutPathIsSafe(relative)) {
        throw new ZeroYConnectorError({
          code: 'zeroy_checkout_path_invalid',
          message: `Checkout path is unsafe: ${relative}.`,
        })
      }
      const absolute = nodePath.join(directory, name)
      const stat = await fs.stat(absolute)
      if (stat.isDirectory()) {
        await visit(absolute, relative)
      } else if (stat.isFile()) {
        if (
          !['site.json', 'artifacts', 'content', 'locales', 'media'].includes(
            relative.split('/')[0] ?? '',
          )
        ) {
          throw new ZeroYConnectorError({
            code: 'zeroy_checkout_path_outside_contract',
            message: `Checkout path is outside the SiteCheckout contract: ${relative}.`,
          })
        }
        paths.push(relative)
        const rawBytes = await fs.readFile(absolute)
        const bytes = normalizedFileBytes(relative, rawBytes)
        let cursor = tree
        const segments = relative.split('/')
        const filename = segments.pop()
        if (!filename) {
          throw new ZeroYConnectorError({ message: 'Checkout path has no filename.' })
        }
        for (const segment of segments) {
          const child = cursor.directories.get(segment) ?? treeNode()
          cursor.directories.set(segment, child)
          cursor = child
        }
        cursor.files.set(filename, {
          bytes,
          mode: (stat.mode & 0o111) !== 0 ? 'executable' : 'file',
        })
      } else {
        throw new ZeroYConnectorError({
          code: 'zeroy_checkout_entry_invalid',
          message: `Checkout contains a non-file entry: ${relative}.`,
        })
      }
    }
  }

  await visit(root, '')

  const objects = new Map<ObjectHash, StoredObject>()

  const encode = (current: TreeNode): ObjectHash => {
    const entries: SiteTreeEntry[] = []
    for (const [name, child] of current.directories) {
      entries.push({ name, kind: 'tree', hash: encode(child), mode: 'file' })
    }
    for (const [name, file] of current.files) {
      const hash = blobHash(file.bytes)
      objects.set(hash, { objectHash: hash, objectType: 'blob', bytes: file.bytes })
      entries.push({ name, kind: 'blob', hash, mode: file.mode })
    }
    const bytesResult = treeBytes(entries)
    if (bytesResult._tag === 'Failure') {
      throw new ZeroYConnectorError({
        code: `zeroy_${bytesResult.error.code}`,
        message: bytesResult.error.message,
      })
    }
    const hashResult = treeHash(entries)
    if (hashResult._tag === 'Failure') {
      throw new ZeroYConnectorError({
        code: `zeroy_${hashResult.error.code}`,
        message: hashResult.error.message,
      })
    }
    objects.set(hashResult.value, { objectHash: hashResult.value, objectType: 'tree', bytes: bytesResult.value })
    return hashResult.value
  }

  return { rootTree: encode(tree), objects, paths: paths.sort() }
}

// ---------------------------------------------------------------------------
// Helpers — locate checkout
// ---------------------------------------------------------------------------

async function locateCheckout(
  cwd: string,
  checkoutId: string,
): Promise<{ root: string; descriptor: CheckoutDescriptor }> {
  const base = nodePath.join(cwd, '.zeroy-checkouts')
  let names: string[]
  try {
    names = await fs.readdir(base)
  } catch {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_missing',
      message: `Checkout ${checkoutId} was not found under ${base}.`,
    })
  }
  for (const name of names) {
    const root = nodePath.join(base, name)
    try {
      const encoded = await fs.readFile(descriptorFile(root), 'utf-8')
      const parsed = JSON.parse(encoded) as unknown
      const descriptor = decodeCheckoutDescriptor(parsed)
      if (descriptor !== null && descriptor.checkoutId === checkoutId) {
        return { root, descriptor }
      }
    } catch {
      // skip unreadable / invalid descriptors
    }
  }
  throw new ZeroYConnectorError({
    code: 'zeroy_checkout_missing',
    message: `Checkout ${checkoutId} was not found under ${base}.`,
  })
}

// ---------------------------------------------------------------------------
// Helpers — read descriptor / pending
// ---------------------------------------------------------------------------

async function readDescriptor(root: string): Promise<CheckoutDescriptor> {
  const encoded = await fs.readFile(descriptorFile(root), 'utf-8')
  const parsed = JSON.parse(encoded) as unknown
  const descriptor = decodeCheckoutDescriptor(parsed)
  if (descriptor === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_descriptor_invalid',
      message: 'Checkout descriptor violates zeroy/checkout@1.',
    })
  }
  return descriptor
}

async function readPending(root: string): Promise<PendingPush | null> {
  const encoded = await readOptionalFile(pendingFile(root))
  if (encoded === null) return null
  const parsed = JSON.parse(new TextDecoder().decode(encoded)) as unknown
  const pending = decodePendingPush(parsed)
  if (pending === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_pending_push_invalid',
      message: 'Pending push envelope violates zeroy/pending-push@3.',
    })
  }
  return pending
}

// ---------------------------------------------------------------------------
// Helpers — unwrap SiteObjectResult
// ---------------------------------------------------------------------------

function fromSiteObjectResult<A>(value: SiteObjectResult<A>): A {
  if (value._tag === 'Success') return value.value
  throw new ZeroYConnectorError({
    code: `zeroy_${value.error.code}`,
    message: value.error.message,
  })
}

// ---------------------------------------------------------------------------
// Helpers — Connector fetch helpers
// ---------------------------------------------------------------------------

async function fetchObject(
  connection: ResolvedSiteConnection,
  objectHash: string,
  signal: AbortSignal | undefined,
): Promise<Uint8Array> {
  const payload = await connectorGet(connection, `site-objects/${objectHash}`, signal)
  const encoded = typeof payload.bytesBase64 === 'string' ? payload.bytesBase64 : null
  if (encoded === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_site_object_invalid',
      message: 'Connector returned SiteObject without bytes.',
    })
  }
  const bytes = Buffer.from(encoded, 'base64')
  if (payload.objectType !== 'blob' || blobHash(bytes) !== objectHash) {
    throw new ZeroYConnectorError({
      code: 'zeroy_site_object_hash_mismatch',
      message: 'Downloaded SiteObject bytes do not match their identity.',
    })
  }
  return bytes
}

async function fetchCommitManifest(
  connection: ResolvedSiteConnection,
  commit: ObjectHash,
  signal: AbortSignal | undefined,
): Promise<CheckoutManifest> {
  const payload = await connectorGet(
    connection,
    `site-checkout?${new URLSearchParams({ source: 'commit', commit }).toString()}`,
    signal,
  )
  const manifest = decodeCheckoutManifest(payload)
  if (manifest === null || manifest.commit !== commit) {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_source_invalid',
      message: 'Connector returned an invalid exact-commit checkout manifest.',
    })
  }
  return manifest
}

async function fetchChangedPaths(
  connection: ResolvedSiteConnection,
  base: ObjectHash,
  commit: ObjectHash,
  signal: AbortSignal | undefined,
): Promise<string[]> {
  const paths: string[] = []
  let cursor: string | null = null
  do {
    const query = new URLSearchParams({ base, commit, limit: '50' })
    if (cursor !== null) query.set('cursor', cursor)
    const payload = await connectorGet(connection, `site-commit-diff?${query.toString()}`, signal)
    if (payload.contract !== 'zeroy/site-commit-diff@1' || !Array.isArray(payload.items)) {
      throw new ZeroYConnectorError({
        code: 'zeroy_site_commit_diff_invalid',
        message: 'Connector returned an invalid SiteCommit diff.',
      })
    }
    for (const value of payload.items) {
      const item = asRecord(value)
      const relative = item && typeof item.path === 'string' ? item.path : ''
      if (!checkoutPathIsSafe(relative)) {
        throw new ZeroYConnectorError({
          code: 'zeroy_site_commit_diff_invalid',
          message: 'Connector SiteCommit diff contains an invalid path.',
        })
      }
      paths.push(relative)
    }
    cursor =
      payload.hasMore === true && typeof payload.nextCursor === 'string'
        ? payload.nextCursor
        : null
  } while (cursor !== null)
  return [...new Set(paths)].sort()
}

// ---------------------------------------------------------------------------
// Helpers — workspace build ID
// ---------------------------------------------------------------------------

function workspaceBuildId(value: unknown): string | null {
  const build = asRecord(value)
  const buildId = build && typeof build.buildId === 'string' ? build.buildId : null
  return buildId && /^sha256:[a-f0-9]{64}$/.test(buildId) ? buildId : null
}

// ---------------------------------------------------------------------------
// Helpers — authored seed bytes
// ---------------------------------------------------------------------------

function authoredSeedBytes(value: unknown): Uint8Array | null {
  const seed = asRecord(value)
  if (seed?.encoding === 'utf8' && typeof seed.content === 'string')
    return new TextEncoder().encode(seed.content)
  if (seed?.encoding === 'base64' && typeof seed.bytesBase64 === 'string') {
    const bytes = Buffer.from(seed.bytesBase64, 'base64')
    return bytes.toString('base64') === seed.bytesBase64 ? bytes : null
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers — replace workspace projection
// ---------------------------------------------------------------------------

async function replaceWorkspaceProjection(
  connection: ResolvedSiteConnection,
  root: string,
  commit: ObjectHash,
  buildId: string,
  reviewSource: 'baseline' | 'owned-draft',
  signal: AbortSignal | undefined,
): Promise<void> {
  const reviewParameters = new URLSearchParams({ commit, buildId })
  const reviewEndpoint =
    reviewSource === 'baseline' ? 'site-review/baseline-workspace' : 'site-review/workspace'
  const [response, reviewResponse] = await Promise.all([
    connectorGet(connection, `site-builds/${buildId}/workspace`, signal),
    connectorGet(connection, `${reviewEndpoint}?${reviewParameters.toString()}`, signal),
  ])
  const files = asRecord(response.files)
  const authoredSeeds = asRecord(response.authoredSeeds)
  const reviewFiles = asRecord(reviewResponse.files)
  if (files === null || authoredSeeds === null || reviewFiles === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_workspace_projection_invalid',
      message: 'Connector returned an invalid Workspace or Review projection.',
    })
  }
  const metadata = nodePath.join(root, '.zeroy')
  const next = nodePath.join(root, `.zeroy.next-${randomUUID()}`)
  const previous = nodePath.join(root, `.zeroy.previous-${randomUUID()}`)
  await fs.mkdir(next, { recursive: true })
  for (const [projectedPath, value] of Object.entries({ ...files, ...reviewFiles })) {
    if (!projectedPath.startsWith('.zeroy/') || !checkoutPathIsSafe(projectedPath)) {
      throw new ZeroYConnectorError({
        code: 'zeroy_workspace_projection_invalid',
        message: `WorkspaceProjection contains an invalid path: ${projectedPath}.`,
      })
    }
    const relative = projectedPath.slice('.zeroy/'.length)
    const target = nodePath.join(next, ...relative.split('/'))
    await fs.mkdir(nodePath.dirname(target), { recursive: true })
    const encoded = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
    await fs.writeFile(target, encoded, 'utf-8')
  }
  for (const name of ['checkout.json', 'pending-push.json', 'conflicts.json']) {
    const bytes = await readOptionalFile(nodePath.join(metadata, name))
    if (bytes !== null) {
      await fs.writeFile(nodePath.join(next, name), bytes)
    }
  }
  const exists = await fileExists(metadata)
  if (exists) await fs.rename(metadata, previous)
  await fs.rename(next, metadata)
  if (exists) {
    try { await fs.rm(previous, { recursive: true, force: true }) } catch { /* ignore */ }
  }
  for (const [seedPath, value] of Object.entries(authoredSeeds)) {
    const bytes = authoredSeedBytes(value)
    if (seedPath.startsWith('.zeroy/') || !checkoutPathIsSafe(seedPath) || bytes === null) {
      throw new ZeroYConnectorError({
        code: 'zeroy_workspace_projection_invalid',
        message: `WorkspaceProjection contains an invalid authored seed: ${seedPath}.`,
      })
    }
    const target = nodePath.join(root, ...seedPath.split('/'))
    if (await fileExists(target)) continue
    await fs.mkdir(nodePath.dirname(target), { recursive: true })
    await fs.writeFile(target, bytes)
  }
}

// ---------------------------------------------------------------------------
// Helpers — three-way merge for rebase
// ---------------------------------------------------------------------------

function runTextThreeWayMerge(
  cwd: string,
  label: string,
  ours: string,
  base: string,
  remote: string,
): Promise<{ readonly output: string; readonly conflicted: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      [
        'merge-file', '--stdout',
        '-L', `${label} (ours)`,
        '-L', `${label} (base)`,
        '-L', `${label} (remote)`,
        ours, base, remote,
      ],
      { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let output = ''
    let error = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { output += chunk })
    child.stderr.on('data', (chunk: string) => { error += chunk })
    child.once('error', cause =>
      reject(new ZeroYConnectorError({ message: `git merge-file failed: ${String(cause)}` })))
    child.once('exit', (code) => {
      if (code === 0 || code === 1) {
        resolve({ output, conflicted: code === 1 })
        return
      }
      reject(new ZeroYConnectorError({ message: `git merge-file failed: ${error.trim()}` }))
    })
  })
}

async function writeWorkingFile(
  root: string,
  relative: string,
  bytes: Uint8Array | null,
  mode: 'file' | 'executable' = 'file',
): Promise<void> {
  const target = nodePath.join(root, ...relative.split('/'))
  if (bytes === null) {
    try { await fs.unlink(target) } catch { /* ignore */ }
    return
  }
  await fs.mkdir(nodePath.dirname(target), { recursive: true })
  await fs.writeFile(target, bytes)
  await fs.chmod(target, mode === 'executable' ? 0o755 : 0o644)
}

async function manifestFileBytes(
  connection: ResolvedSiteConnection,
  file: CheckoutManifestFile | undefined,
  signal: AbortSignal | undefined,
): Promise<Uint8Array | null> {
  if (file === undefined) return null
  return fetchObject(connection, file.hash, signal)
}

async function mergeOverlappingFile(
  connection: ResolvedSiteConnection,
  root: string,
  relative: string,
  baseFile: CheckoutManifestFile | undefined,
  remoteFile: CheckoutManifestFile | undefined,
  signal: AbortSignal | undefined,
): Promise<readonly MergeConflict[]> {
  const ours = await readOptionalFile(nodePath.join(root, ...relative.split('/')))
  const base = await manifestFileBytes(connection, baseFile, signal)
  const remote = await manifestFileBytes(connection, remoteFile, signal)
  const mode = remoteFile?.mode ?? baseFile?.mode ?? 'file'

  if (ours !== null && remote !== null && Buffer.from(ours).equals(Buffer.from(remote))) {
    await writeWorkingFile(root, relative, ours, mode)
    return []
  }
  if (base !== null && ours === null && remote !== null) {
    if (Buffer.from(base).equals(Buffer.from(remote))) {
      await writeWorkingFile(root, relative, null)
      return []
    }
    return [{ path: relative, kind: 'delete-modify' }]
  }
  if (base !== null && ours !== null && remote === null) {
    if (Buffer.from(base).equals(Buffer.from(ours))) {
      await writeWorkingFile(root, relative, null)
      return []
    }
    return [{ path: relative, kind: 'delete-modify' }]
  }
  if (base === null || ours === null || remote === null) {
    return [{ path: relative, kind: incompleteMergeConflictKind(relative) }]
  }
  if (relative.toLowerCase().endsWith('.json')) {
    let decoded: { base: unknown; ours: unknown; remote: unknown }
    try {
      decoded = {
        base: decodeJsonDocument(base),
        ours: decodeJsonDocument(ours),
        remote: decodeJsonDocument(remote),
      }
    } catch {
      throw new ZeroYConnectorError({ message: `Could not decode JSON merge inputs for ${relative}.` })
    }
    const merged = mergeJsonDocuments(decoded.base, decoded.ours, decoded.remote)
    await writeWorkingFile(root, relative, encodeJsonDocument(merged.value), mode)
    return merged.conflicts.map(
      (fieldPath): MergeConflict => ({ path: relative, fieldPath, kind: 'content' }),
    )
  }
  if (!isMergeableTextPath(relative)) {
    return [{ path: relative, kind: 'binary' }]
  }
  const mergeRoot = nodePath.join(root, '.zeroy', 'merge', randomUUID())
  await fs.mkdir(mergeRoot, { recursive: true })
  try {
    const oursPath = nodePath.join(mergeRoot, 'ours')
    const basePath = nodePath.join(mergeRoot, 'base')
    const remotePath = nodePath.join(mergeRoot, 'remote')
    await Promise.all([
      fs.writeFile(oursPath, ours),
      fs.writeFile(basePath, base),
      fs.writeFile(remotePath, remote),
    ])
    const merged = await runTextThreeWayMerge(root, relative, oursPath, basePath, remotePath)
    await writeWorkingFile(root, relative, normalizedTextBytes(merged.output), mode)
    return merged.conflicted
      ? [{ path: relative, kind: 'content' }]
      : []
  } finally {
    try { await fs.rm(mergeRoot, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Helpers — materialize remote git commit
// ---------------------------------------------------------------------------

async function materializeRemoteGitCommit(
  connection: ResolvedSiteConnection,
  root: string,
  commit: ObjectHash,
  signal: AbortSignal | undefined,
): Promise<string> {
  // Check if already materialized
  try {
    const existing = (await runCommandOutput(root, 'git', [
      'rev-parse', '--verify', zeroYCommitGitRef(commit),
    ])).trim()
    return existing
  } catch {
    // Not yet materialized
  }

  const [manifest, siteCommitPayload] = await Promise.all([
    fetchCommitManifest(connection, commit, signal),
    connectorGet(connection, `site-commits/${commit}`, signal),
  ])

  const decoded = decodeSiteCommit(siteCommitPayload.commit)
  if (decoded._tag === 'Failure') {
    throw new ZeroYConnectorError({
      code: 'zeroy_site_commit_hash_mismatch',
      message: 'Connector SiteCommit bytes do not match their identity.',
    })
  }
  const actual = commitHash(decoded.value)
  if (actual._tag !== 'Success' || actual.value !== commit) {
    throw new ZeroYConnectorError({
      code: 'zeroy_site_commit_hash_mismatch',
      message: 'Connector SiteCommit bytes do not match their identity.',
    })
  }
  const siteCommit = decoded.value

  const parent = siteCommit.parents[0]
  const parentGit = parent === undefined
    ? null
    : await materializeRemoteGitCommit(connection, root, parent, signal)

  const worktree = nodePath.join(nodePath.dirname(root), `.zeroy-git-materialize-${randomUUID()}`)
  await runGit(root, ['worktree', 'add', '--detach', worktree, parentGit ?? 'HEAD'])
  try {
    if (parentGit === null) {
      await runGit(worktree, ['checkout', '--orphan', `zeroy-root-${randomUUID()}`])
    }
    const entries = await fs.readdir(worktree)
    for (const name of entries) {
      if (name !== '.git') {
        await fs.rm(nodePath.join(worktree, name), { recursive: true, force: true })
      }
    }
    for (const file of manifest.files.values()) {
      const bytes = await fetchObject(connection, file.hash, signal)
      const target = nodePath.join(worktree, ...file.path.split('/'))
      await fs.mkdir(nodePath.dirname(target), { recursive: true })
      await fs.writeFile(target, bytes)
      await fs.chmod(target, file.mode === 'executable' ? 0o755 : 0o644)
    }
    await runGit(worktree, ['add', '--all'])
    await runGit(worktree, [
      '-c', 'user.name=zeroY',
      '-c', 'user.email=zeroy@local',
      'commit', '--allow-empty',
      '-m', `${siteCommit.message}\n\nzeroY-Commit: ${commit}\nzeroY-Tree: ${siteCommit.tree}\nzeroY-Base-Release: ${siteCommit.baseReleaseId ?? 'none'}`,
    ])
    const created = (await runCommandOutput(worktree, 'git', ['rev-parse', 'HEAD'])).trim()
    await runGit(root, ['update-ref', zeroYCommitGitRef(commit), created])
    return created
  } finally {
    try { await runGit(root, ['worktree', 'remove', '--force', worktree]) } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Helpers — rebase checkout
// ---------------------------------------------------------------------------

async function rebaseCheckout(
  connection: ResolvedSiteConnection,
  root: string,
  descriptor: CheckoutDescriptor,
  current: ObjectHash,
  remotePaths: readonly string[],
  localPaths: readonly string[],
  signal: AbortSignal | undefined,
  expectedRefCommit: ObjectHash = current,
): Promise<readonly MergeConflict[]> {
  if (descriptor.observedCommit === null) {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_base_missing',
      message: 'Checkout has no observed commit for three-way comparison.',
    })
  }
  const [base, remote, remoteGit] = await Promise.all([
    fetchCommitManifest(connection, descriptor.observedCommit, signal),
    fetchCommitManifest(connection, current, signal),
    materializeRemoteGitCommit(connection, root, current, signal),
  ])
  const baseGit = (await runCommandOutput(root, 'git', [
    'rev-parse', '--verify', zeroYCommitGitRef(descriptor.observedCommit),
  ])).trim()
  const local = new Set(localPaths)
  const conflicts: MergeConflict[] = []
  for (const relative of remotePaths) {
    const remoteFile = remote.files.get(relative)
    if (!local.has(relative)) {
      const bytes = await manifestFileBytes(connection, remoteFile, signal)
      await writeWorkingFile(root, relative, bytes, remoteFile?.mode)
      continue
    }
    conflicts.push(
      ...(await mergeOverlappingFile(
        connection,
        root,
        relative,
        base.files.get(relative),
        remoteFile,
        signal,
      )),
    )
  }
  await runGit(root, ['add', '--all'])
  await runGit(root, [
    '-c', 'user.name=zeroY',
    '-c', 'user.email=zeroy@local',
    'commit', '--amend', '--no-edit',
  ])
  const localGit = (await runCommandOutput(root, 'git', ['rev-parse', 'HEAD'])).trim()
  const rebased = await runCommandStatus(root, 'git', [
    '-c', 'merge.conflictStyle=diff3',
    'rebase', '--onto', remoteGit, baseGit, localGit,
  ])
  const expectedRefGit = (await runCommandOutput(root, 'git', [
    'rev-parse', '--verify', zeroYCommitGitRef(expectedRefCommit),
  ])).trim()
  await runGit(root, ['update-ref', zeroYRemoteGitRef(descriptor.remoteRef), expectedRefGit])
  let rebaseCompleted = rebased.code === 0
  if (!rebaseCompleted) {
    const initiallyUnmerged = (await runCommandOutput(root, 'git', [
      'diff', '--name-only', '--diff-filter=U', '-z',
    ]))
      .split('\0')
      .filter(relative => relative.length > 0)
    const semanticConflictPaths = new Set(conflicts.map(conflict => conflict.path))
    for (const relative of initiallyUnmerged) {
      if (!semanticConflictPaths.has(relative)) {
        await runGit(root, ['checkout', localGit, '--', relative])
      }
    }
    const unmerged = (await runCommandOutput(root, 'git', [
      'diff', '--name-only', '--diff-filter=U', '-z',
    ]))
      .split('\0')
      .filter(relative => relative.length > 0)
    if (unmerged.length === 0 && conflicts.length === 0) {
      await runGit(root, ['-c', 'core.editor=true', 'rebase', '--continue'])
      rebaseCompleted = true
    }
    for (const relative of unmerged) {
      if (!conflicts.some(conflict => conflict.path === relative)) {
        conflicts.push({ path: relative, kind: 'content' })
      }
    }
    if (!rebaseCompleted && conflicts.length === 0) {
      throw new ZeroYConnectorError({
        code: 'zeroy_checkout_rebase_failed',
        message: `Git rebase failed without a conflict index: ${rebased.error}`,
      })
    }
  }
  if (rebaseCompleted) {
    if (conflicts.length > 0) {
      throw new ZeroYConnectorError({
        code: 'zeroy_checkout_conflict_index_missing',
        message: 'Semantic merge reported a conflict but Git did not preserve an unmerged index.',
      })
    }
    await runGit(root, ['reset', '--mixed', remoteGit])
  }
  await writeJson(descriptorFile(root), {
    ...descriptor,
    observedCommit: current,
    expectedRefCommit,
    baseReleaseId: remote.baseReleaseId,
    materializedAt: new Date().toISOString(),
  })
  return conflicts
}

// ---------------------------------------------------------------------------
// Helpers — push agent projection
// ---------------------------------------------------------------------------

const asString = (value: unknown, limit = 512): string | null =>
  typeof value === 'string' ? value.slice(0, limit) : null

const asCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null

function pushAgentProjection(value: unknown): JsonRecord {
  const receipt = asRecord(value) ?? {}
  const build = asRecord(receipt.build)
  const preview = asRecord(receipt.preview)
  const proof = asRecord(receipt.proof)
  const review = asRecord(receipt.review)
  const browser = asRecord(receipt.browser)
  const preflight = asRecord(receipt.preflight)

  return {
    contract: 'zeroy/push-result@1',
    commit: asString(receipt.commit, 128),
    draftRef: asString(receipt.draftRef, 256),
    build: build === null ? null : {
      buildId: asString(build.buildId, 128),
      state: asString(build.state, 64),
      failureCount: asCount(build.failureCount),
      diagnosticCount: asCount(build.diagnosticCount),
    },
    preview: preview === null ? null : {
      releaseId: asString(preview.releaseId, 128),
      url: asString(preview.url, 2048),
      state: asString(preview.state, 64),
    },
    proof: proof === null ? null : {
      proofId: asString(proof.proofId, 128),
      state: asString(proof.state, 64),
      failureCount: asCount(proof.failureCount),
    },
    review: review === null ? null : {
      state: asString(review.state, 64),
      remainingCount: asCount(review.remainingCount),
      releaseId: asString(review.releaseId, 128),
      proofId: asString(review.proofId, 128),
    },
    browser: browser === null ? null : {
      state: asString(browser.state, 64),
      code: asString(browser.code, 128),
      message: asString(browser.message),
    },
    preflight: preflight === null ? null : {
      state: asString(preflight.state, 64),
      code: asString(preflight.code, 128),
      message: asString(preflight.message),
    },
  }
}

// ---------------------------------------------------------------------------
// Connection type alias for resolved connections
// ---------------------------------------------------------------------------

type ResolvedSiteConnection = {
  readonly siteId: string
  readonly label: string
  readonly endpoint: string
  readonly grant: { readonly id: string; readonly credentialRef: string } | null
  readonly connectionKey: string | null
  readonly revoked: boolean
  readonly grantSecret: string
  readonly readGrantSecret?: () => string
}

// ---------------------------------------------------------------------------
// Core push logic
// ---------------------------------------------------------------------------

async function executePush(
  ctx: Context,
  input: { siteId: string; checkoutId: string; message?: string },
  signal: AbortSignal | undefined,
): Promise<JsonRecord> {
  const connection = await resolveConnection(ctx, input.siteId) as ResolvedSiteConnection
  const cwd = process.cwd()

  const located = await locateCheckout(cwd, input.checkoutId)
  if (located.descriptor.siteId !== input.siteId) {
    throw new ZeroYConnectorError({
      code: 'zeroy_checkout_site_mismatch',
      message: 'Checkout belongs to a different site.',
    })
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const descriptor = attempt === 0
      ? located.descriptor
      : await readDescriptor(located.root)

    // Check for unresolved conflicts
    if (await fileExists(conflictsFile(located.root))) {
      throw new ZeroYConnectorError({
        code: 'zeroy_checkout_conflict_unresolved',
        message:
          'Checkout still has unresolved .zeroy/conflicts.json. Resolve the listed files and field paths, then delete the conflict fact before pushing.',
      })
    }

    await finishPendingGitRebase(located.root, descriptor.observedCommit)

    const scan = await scanCheckout(located.root)
    const changedPaths = await gitChangedPaths(located.root)

    // PHP lint check
    const phpFiles = scan.paths.filter(relative => relative.toLowerCase().endsWith('.php'))
    await Promise.all(
      phpFiles.map(relative => runCommand(located.root, 'php', ['-l', relative])),
    )

    // Validate workspace documents
    const localValidation = await validateWorkspaceDocuments(located.root, scan.paths)
    if (localValidation.failures.length > 0) {
      throw new ZeroYConnectorError({
        code: 'zeroy_workspace_contract_invalid',
        status: 400,
        message:
          "Authored JSON violates the checkout's concrete WorkspaceContracts. Repair the listed files before pushing.",
        data: {
          failures: localValidation.failures.slice(0, 20),
          failureCount: localValidation.failures.length,
        },
      })
    }

    const existingPending = await readPending(located.root)
    if (
      existingPending !== null
      && (existingPending.rootTree !== scan.rootTree
        || existingPending.message !== (input.message ?? ''))
    ) {
      throw new ZeroYConnectorError({
        code: 'zeroy_pending_push_conflict',
        message:
          'An unresolved push exists for different checkout bytes. Retry the original push before editing or pushing again.',
      })
    }

    // Baseline fork detection
    const baselineFork =
      existingPending === null
      && changedPaths.length === 0
      && descriptor.expectedRefCommit === null
      && descriptor.observedCommit !== null

    const reuseObservedCommit =
      existingPending === null
      && changedPaths.length === 0
      && descriptor.observedCommit !== null
      && !baselineFork

    let commit: SiteCommit
    if (existingPending !== null) {
      commit = existingPending.commit
    } else if (reuseObservedCommit) {
      const payload = await connectorGet(
        connection,
        `site-commits/${descriptor.observedCommit}`,
        signal,
      )
      const decoded = decodeSiteCommit(payload.commit)
      if (decoded._tag === 'Failure') {
        throw new ZeroYConnectorError({
          code: 'zeroy_site_commit_invalid',
          message: 'Connector returned an invalid SiteCommit.',
        })
      }
      const actual = commitHash(decoded.value)
      if (actual._tag !== 'Success' || actual.value !== descriptor.observedCommit) {
        throw new ZeroYConnectorError({
          code: 'zeroy_site_commit_hash_mismatch',
          message: 'Connector SiteCommit bytes do not match their identity.',
        })
      }
      commit = decoded.value
    } else {
      commit = {
        contract: 'zeroy/site-commit@1',
        tree: scan.rootTree,
        parents: descriptor.observedCommit === null ? [] : [descriptor.observedCommit],
        baseReleaseId: descriptor.baseReleaseId,
        author: {
          principal: `site:${input.siteId}`,
          actorSessionId: `dsh-${randomUUID()}`,
        },
        message: input.message ?? '',
        createdAt: new Date().toISOString(),
      }
    }

    let commitId: ObjectHash
    if (existingPending?.commitHash) {
      commitId = existingPending.commitHash
    } else if (reuseObservedCommit) {
      if (descriptor.observedCommit === null) throw new Error('Checkout has no observed commit')
      commitId = descriptor.observedCommit
    } else {
      commitId = fromSiteObjectResult(commitHash(commit))
    }

    // Record local git commit for new changes or baseline forks
    if (existingPending === null && (changedPaths.length > 0 || baselineFork)) {
      await recordLocalZeroYGitCommit(
        located.root,
        baselineFork
          ? `zeroY baseline fork: ${commitId.slice(0, 19)}`
          : `zeroY push: ${commitId.slice(0, 19)}`,
        commitId,
        scan.rootTree,
        descriptor.baseReleaseId,
      )
    }

    // Upload missing objects
    const hashes = [...scan.objects.keys()]
    const want = await connectorPost(connection, 'site-objects/have', { hashes }, signal)
    const missing = Array.isArray(want.missing)
      ? want.missing.filter((hash): hash is string => typeof hash === 'string')
      : []
    let uploadedBytes = 0
    for (let index = 0; index < missing.length; index += 20) {
      const batch: Array<{ objectHash: string; objectType: string; bytesBase64: string }> = []
      for (const hash of missing.slice(index, index + 20)) {
        const object = scan.objects.get(hash as ObjectHash)
        if (!object) {
          throw new ZeroYConnectorError({
            code: 'zeroy_site_object_want_invalid',
            message: `Connector requested unknown object ${hash}.`,
          })
        }
        uploadedBytes += object.bytes.byteLength
        batch.push({
          objectHash: object.objectHash,
          objectType: object.objectType,
          bytesBase64: Buffer.from(object.bytes).toString('base64'),
        })
      }
      await connectorPost(connection, 'site-objects', { objects: batch }, signal)
    }

    // Create the SiteCommit via CAS
    await connectorPost(connection, 'site-commits', { commitHash: commitId, commit }, signal)

    const changeSummary = existingPending?.changeSummary ?? {
      changedPathCount: changedPaths.length,
      changedSubjectCount: changedPaths.filter(
        value => value.startsWith('content/') || value.startsWith('locales/'),
      ).length,
      uploadedObjectCount: missing.length,
      uploadedBytes,
    }

    const request = {
      checkoutId: input.checkoutId,
      refName: descriptor.remoteRef,
      expectedCommit: descriptor.expectedRefCommit,
      commitHash: commitId,
      message: input.message ?? '',
      changeSummary,
    }

    const requestHash =
      existingPending?.requestHash ?? fromSiteObjectResult(pushRequestHash(request))

    const pending: PendingPush = existingPending ?? {
      contract: 'zeroy/pending-push@3',
      commandId: randomUUID(),
      requestHash,
      commitHash: commitId,
      commit,
      expectedCommit: descriptor.expectedRefCommit,
      rootTree: scan.rootTree,
      message: input.message ?? '',
      changeSummary,
    }

    await writeJson(pendingFile(located.root), pending)

    // Attempt the push
    let receipt: JsonRecord
    try {
      receipt = await connectorPost(
        connection,
        'site-push',
        { commandId: pending.commandId, requestHash: pending.requestHash, ...request },
        signal,
        `dsh-${randomUUID()}`,
      )
    } catch (error) {
      if (!(error instanceof ZeroYConnectorError)) throw error

      // Handle active-release change
      if (error.code === 'zeroy_active_site_release_changed') {
        if (descriptor.observedCommit === null) {
          throw new ZeroYConnectorError({
            code: 'zeroy_checkout_base_missing',
            message: 'Active SiteRelease advanced but checkout has no merge base.',
          })
        }
        const payload = await connectorGet(connection, 'site-checkout', signal)
        const remote = decodeCheckoutManifest(payload)
        if (remote === null) {
          throw new ZeroYConnectorError({
            code: 'zeroy_checkout_source_invalid',
            message: 'Connector returned an invalid active SiteCheckout manifest.',
          })
        }
        const remotePaths = await fetchChangedPaths(
          connection,
          descriptor.observedCommit,
          remote.commit,
          signal,
        )
        const conflicts = await rebaseCheckout(
          connection,
          located.root,
          descriptor,
          remote.commit,
          remotePaths,
          changedPaths,
          signal,
          commitId,
        )
        try { await fs.unlink(pendingFile(located.root)) } catch { /* ignore */ }
        if (conflicts.length > 0) {
          await writeJson(conflictsFile(located.root), {
            contract: 'zeroy/checkout-conflicts@1',
            base: descriptor.observedCommit,
            remote: remote.commit,
            changedPathCount: remotePaths.length,
            changedPaths: remotePaths,
            conflicts,
          })
          throw new ZeroYConnectorError({
            code: 'zeroy_checkout_conflict',
            message:
              'Active SiteRelease advanced. Non-conflicting changes were rebased locally and conflicts were written to .zeroy/conflicts.json.',
            status: 409,
            data: { currentCommit: remote.commit, changedPaths: remotePaths, conflicts },
          })
        }
        // Internal rebase retry
        continue
      }

      // Handle remote ref change
      if (error.code !== 'zeroy_remote_ref_changed') throw error

      const current = error.data?.currentCommit
      const remotePaths = Array.isArray(error.data?.changedPaths)
        ? error.data.changedPaths.filter(
          (value): value is string => typeof value === 'string' && checkoutPathIsSafe(value),
        )
        : []
      const changedCount = Number(error.data?.changedPathCount ?? -1)
      const complete =
        typeof current === 'string'
        && /^sha256:[a-f0-9]{64}$/.test(current)
        && changedCount === remotePaths.length

      if (!complete) {
        await writeJson(conflictsFile(located.root), {
          contract: 'zeroy/checkout-conflicts@1',
          base: descriptor.observedCommit,
          remote: typeof current === 'string' ? current : null,
          changedPathCount: changedCount,
          changedPaths: remotePaths,
          conflicts: [{ path: null, kind: 'remote-diff-truncated' }],
        })
        try { await fs.unlink(pendingFile(located.root)) } catch { /* ignore */ }
        throw new ZeroYConnectorError({
          code: 'zeroy_checkout_conflict',
          message:
            'DraftRef changed and local edits overlap or the remote diff is truncated. Resolve .zeroy/conflicts.json by checking out the remote DraftRef and applying the local patch.',
          status: 409,
          data: {
            currentCommit: typeof current === 'string' ? current : null,
            changedPathCount: changedCount,
            changedPaths: remotePaths,
            conflicts: [{ path: null, kind: 'remote-diff-truncated' }],
          },
        })
      }

      const conflicts = await rebaseCheckout(
        connection,
        located.root,
        descriptor,
        current as ObjectHash,
        remotePaths,
        changedPaths,
        signal,
      )
      try { await fs.unlink(pendingFile(located.root)) } catch { /* ignore */ }
      if (conflicts.length > 0) {
        await writeJson(conflictsFile(located.root), {
          contract: 'zeroy/checkout-conflicts@1',
          base: descriptor.observedCommit,
          remote: current,
          changedPathCount: changedCount,
          changedPaths: remotePaths,
          conflicts,
        })
        throw new ZeroYConnectorError({
          code: 'zeroy_checkout_conflict',
          message:
            'DraftRef advanced. Non-conflicting changes were rebased locally and conflicts were written to .zeroy/conflicts.json. Resolve them, delete the conflict fact, and retry the push.',
          status: 409,
          data: { currentCommit: current, changedPaths: remotePaths, conflicts },
        })
      }
      // Internal rebase retry
      continue
    }

    // Push succeeded — update descriptor
    const acceptedReceipt = receipt
    const next: CheckoutDescriptor = {
      ...descriptor,
      observedCommit: commitId,
      expectedRefCommit: commitId,
      baseReleaseId:
        asRecord(acceptedReceipt.release)
        && typeof (asRecord(acceptedReceipt.release) as Record<string, unknown>)?.releaseId === 'string'
          ? ((asRecord(acceptedReceipt.release) as Record<string, unknown>).releaseId as string)
          : descriptor.baseReleaseId,
      materializedAt: new Date().toISOString(),
    }

    await writeJson(descriptorFile(located.root), next)

    // Browser verification (optional)
    const preview = asRecord(acceptedReceipt.preview)
    const browserChallenge = preview === null ? null : asRecord(preview.browserVerification)
    if (
      preview !== null
      && typeof preview.releaseId === 'string'
      && browserChallenge !== null
    ) {
      try {
        const browserEvidence = await verifyBrowserChallenge(
          browserChallenge as never,
          signal,
        )
        receipt = await connectorPost(
          connection,
          'site-push/finalize',
          {
            commandId: pending.commandId,
            requestHash: pending.requestHash,
            releaseId: preview.releaseId,
            browserEvidence,
          },
          signal,
          `dsh-${randomUUID()}`,
        )
      } catch (finalizationError) {
        const failCode = finalizationError instanceof ZeroYConnectorError
          ? finalizationError.code ?? 'unknown'
          : 'unknown'
        const failMessage = finalizationError instanceof Error
          ? finalizationError.message
          : String(finalizationError)
        receipt = {
          ...acceptedReceipt,
          browser: {
            state: 'deferred',
            releaseId: preview.releaseId,
            code: failCode,
            message: failMessage,
          },
        }
      }
    }

    const buildId = workspaceBuildId((receipt as JsonRecord).build)
    if (buildId === null) {
      throw new ZeroYConnectorError({
        code: 'zeroy_build_result_missing',
        message: 'Push receipt did not identify its exact BuildResult.',
      })
    }

    await replaceWorkspaceProjection(
      connection,
      located.root,
      commitId,
      buildId,
      'owned-draft',
      signal,
    )

    try { await fs.unlink(pendingFile(located.root)) } catch { /* ignore */ }

    const acceptedGitCommit = (await runCommandOutput(located.root, 'git', [
      'rev-parse', 'HEAD',
    ])).trim()
    await mapZeroYGitRefs(located.root, commitId, next.remoteRef, acceptedGitCommit)

    return pushAgentProjection(receipt)
  }

  throw new ZeroYConnectorError({
    code: 'zeroy_checkout_rebase_limit',
    message: 'DraftRef kept advancing during automatic rebase.',
  })
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * Register the `zeroy_push` tool on the given context.
 * @param ctx - plugin context that owns the tool registry; no-ops when schema projection failed.
 */
export function registerPushTool(ctx: Context): void {
  if (PushProviderProjection._tag === 'Failure') {
    ctx.logger.warn('tool-zeroy: zeroy_push disabled — schema projection failed: %s',
      PushProviderProjection.error.message)
    return
  }

  // DSH-native parameter schema. Full validation happens inside execute via decodePushInput.
  const parameters = {
    siteId: { type: 'string' as const, required: true as const, description: 'Configured zeroY site identifier.' },
    checkoutId: { type: 'string' as const, required: true as const, description: 'Checkout ID returned by zeroy_checkout.' },
    message: { type: 'string' as const, description: 'Optional commit message (max 500 chars).' },
  }

  ctx.tools.register(defineTool({
    name: 'zeroy_push',
    description: PUSH_DESCRIPTION,
    parameters,
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => false,
    async execute(args: unknown, exec: { signal?: AbortSignal }) {
      const decoded = decodePushInput(args)
      if (decoded._tag === 'Failure') {
        throw new Error(decoded.error.message)
      }

      const input = decoded.value
      const gate = getMutationGate()
      const result = await gate.withGate(input.siteId, () =>
        executePush(ctx, input, exec.signal))

      return result
    },
  } as never))
}
