/**
 * `zeroy_checkout` tool: materialize one immutable SiteCommit as a local
 * working tree with Git baseline tracking.
 *
 * Ported from the Pi `checkoutTool` in `checkout-tools.ts`. All Effect-TS
 * patterns are replaced with async/await; Node.js built-ins are used directly.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/tools/checkout
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as nodePath from 'node:path'
import {
  CheckoutProviderProjection,
  decodeCheckoutInput,
  CHECKOUT_PROMPT_GUIDELINES,
} from '../domain/protocol.ts'
import { resolveConnection, getMutationGate } from '../session.ts'
import { connectorGet, ZeroYConnectorError } from '../domain/client.ts'
import type { JsonRecord } from '../domain/client.ts'
import type { SiteConnection } from '../domain/connection.ts'
import {
  blobHash,
  checkoutPathIsSafe,
  type ObjectHash,
} from '../domain/site-objects.ts'

// ---------------------------------------------------------------------------
// Types
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

// ---------------------------------------------------------------------------
// Tool description
// ---------------------------------------------------------------------------

const CHECKOUT_DESCRIPTION =
  'Materialize one immutable zeroY SiteCommit as a local Git-tracked working tree. '
  + CHECKOUT_PROMPT_GUIDELINES

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const failure = (message: string, code = 'zeroy_checkout_io_failed') =>
  new ZeroYConnectorError({ message, code })

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const safeCheckoutLabel = (label: string): string =>
  label
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 40) || 'site'

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

function runCommand(
  cwd: string,
  command: string,
  args: readonly string[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let error = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      error += chunk
    })
    child.once('error', cause =>
      reject(failure(`${command} ${args[0] ?? ''} failed: ${String(cause)}`)),
    )
    child.once('exit', (code) => {
      if (code === 0) resolve()
      else reject(failure(`${command} ${args[0] ?? ''} failed: ${error.trim()}`))
    })
  })
}

function runCommandOutput(
  cwd: string,
  command: string,
  args: readonly string[],
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    let error = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      error += chunk
    })
    child.once('error', cause =>
      reject(failure(`${command} ${args[0] ?? ''} failed: ${String(cause)}`)),
    )
    child.once('exit', (code) => {
      if (code === 0) resolve(output)
      else reject(failure(`${command} ${args[0] ?? ''} failed: ${error.trim()}`))
    })
  })
}

const runGit = (cwd: string, args: readonly string[]) => runCommand(cwd, 'git', args)

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
  await runGit(root, ['update-ref', zeroYCommitGitRef(commit), gitCommit])
  await runGit(root, ['update-ref', zeroYRemoteGitRef(remoteRef), gitCommit])
}

async function recordZeroYGitCommit(
  root: string,
  message: string,
  commit: ObjectHash,
  tree: ObjectHash,
  baseReleaseId: string | null,
  remoteRef: string,
): Promise<string> {
  await runGit(root, ['add', '--all'])
  await runGit(root, [
    '-c', 'user.name=zeroY',
    '-c', 'user.email=zeroy@local',
    'commit',
    '--allow-empty',
    '-m',
    `${message}\n\nzeroY-Commit: ${commit}\nzeroY-Tree: ${tree}\nzeroY-Base-Release: ${baseReleaseId ?? 'none'}`,
  ])
  const head = (await runCommandOutput(root, 'git', ['rev-parse', 'HEAD'])).trim()
  await mapZeroYGitRefs(root, commit, remoteRef, head)
  return head
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(nodePath.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function descriptorPath(root: string): string {
  return nodePath.join(root, '.zeroy', 'checkout.json')
}

// ---------------------------------------------------------------------------
// Connector fetch helpers
// ---------------------------------------------------------------------------

async function fetchObject(
  connection: { siteId: string; label: string; endpoint: string; grantSecret: string },
  _siteId: string,
  objectHash: string,
  signal: AbortSignal | undefined,
): Promise<Buffer> {
  const payload = await connectorGet(connection as unknown as SiteConnection, `site-objects/${objectHash}`, signal)
  const encoded = typeof payload.bytesBase64 === 'string' ? payload.bytesBase64 : null
  if (encoded === null) {
    throw failure(
      'Connector returned SiteObject without bytes.',
      'zeroy_site_object_invalid',
    )
  }
  const bytes = Buffer.from(encoded, 'base64')
  if (payload.objectType !== 'blob' || blobHash(bytes) !== objectHash) {
    throw failure(
      'Downloaded SiteObject bytes do not match their identity.',
      'zeroy_site_object_hash_mismatch',
    )
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Workspace projection
// ---------------------------------------------------------------------------

function workspaceBuildId(value: unknown): string | null {
  const build = asRecord(value)
  const buildId = build && typeof build.buildId === 'string' ? build.buildId : null
  return buildId && /^sha256:[a-f0-9]{64}$/.test(buildId) ? buildId : null
}

function authoredSeedBytes(value: unknown): Uint8Array | null {
  const seed = asRecord(value)
  if (!seed) return null
  if (seed.encoding === 'utf8' && typeof seed.content === 'string')
    return new TextEncoder().encode(seed.content as string)
  if (seed.encoding === 'base64' && typeof seed.bytesBase64 === 'string') {
    const bytes = Buffer.from(seed.bytesBase64 as string, 'base64')
    return bytes.toString('base64') === seed.bytesBase64 ? bytes : null
  }
  return null
}

async function replaceWorkspaceProjection(
  connection: { siteId: string; label: string; endpoint: string; grantSecret: string },
  _siteId: string,
  root: string,
  commit: ObjectHash,
  buildId: string,
  reviewSource: 'baseline' | 'owned-draft',
  signal: AbortSignal | undefined,
): Promise<void> {
  const site = connection as unknown as SiteConnection
  const reviewParameters = new URLSearchParams({ commit, buildId })
  const reviewEndpoint =
    reviewSource === 'baseline' ? 'site-review/baseline-workspace' : 'site-review/workspace'

  const [response, reviewResponse] = await Promise.all([
    connectorGet(site, `site-builds/${buildId}/workspace`, signal),
    connectorGet(site, `${reviewEndpoint}?${reviewParameters.toString()}`, signal),
  ])

  const files = asRecord(response.files)
  const authoredSeeds = asRecord(response.authoredSeeds)
  const reviewFiles = asRecord(reviewResponse.files)
  if (files === null || authoredSeeds === null || reviewFiles === null) {
    throw failure(
      'Connector returned an invalid Workspace or Review projection.',
      'zeroy_workspace_projection_invalid',
    )
  }

  const metadata = nodePath.join(root, '.zeroy')
  const next = nodePath.join(root, `.zeroy.next-${randomUUID()}`)
  const previous = nodePath.join(root, `.zeroy.previous-${randomUUID()}`)

  await fs.mkdir(next, { recursive: true })

  // Write projected files from both workspace and review
  for (const [projectedPath, value] of Object.entries({ ...files, ...reviewFiles })) {
    if (!projectedPath.startsWith('.zeroy/') || !checkoutPathIsSafe(projectedPath)) {
      throw failure(
        `WorkspaceProjection contains an invalid path: ${projectedPath}.`,
        'zeroy_workspace_projection_invalid',
      )
    }
    const relative = projectedPath.slice('.zeroy/'.length)
    const target = nodePath.join(next, ...relative.split('/'))
    await fs.mkdir(nodePath.dirname(target), { recursive: true })
    const encoded = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
    await fs.writeFile(target, encoded, 'utf8')
  }

  // Preserve checkout metadata
  for (const name of ['checkout.json', 'pending-push.json', 'conflicts.json']) {
    try {
      const bytes = await fs.readFile(nodePath.join(metadata, name))
      await fs.writeFile(nodePath.join(next, name), bytes)
    } catch {
      // File does not exist — skip
    }
  }

  // Atomic swap: rename existing .zeroy to previous, then next to .zeroy
  let exists = false
  try {
    await fs.access(metadata)
    exists = true
  } catch {
    // Does not exist
  }

  if (exists) {
    await fs.rename(metadata, previous)
  }
  await fs.rename(next, metadata)
  if (exists) {
    await fs.rm(previous, { recursive: true, force: true })
  }

  // Write authored seeds (only if the target does not already exist)
  for (const [seedPath, value] of Object.entries(authoredSeeds)) {
    const bytes = authoredSeedBytes(value)
    if (seedPath.startsWith('.zeroy/') || !checkoutPathIsSafe(seedPath) || bytes === null) {
      throw failure(
        `WorkspaceProjection contains an invalid authored seed: ${seedPath}.`,
        'zeroy_workspace_projection_invalid',
      )
    }
    const target = nodePath.join(root, ...seedPath.split('/'))
    try {
      await fs.access(target)
      continue // Already exists — skip
    } catch {
      // Does not exist — write it
    }
    await fs.mkdir(nodePath.dirname(target), { recursive: true })
    await fs.writeFile(target, bytes)
  }
}

// ---------------------------------------------------------------------------
// Core checkout logic
// ---------------------------------------------------------------------------

async function performCheckout(
  ctx: Context,
  input: { siteId: string; source: string; draftRef?: string },
  signal: AbortSignal | undefined,
): Promise<{ checkoutId: string; path: string; commit: string | null; fileCount: number }> {
  const connection = await resolveConnection(ctx, input.siteId)
  const site = connection as unknown as SiteConnection

  // Build query parameters for the checkout source
  const parameters = new URLSearchParams()
  if (input.source === 'active-release') {
    parameters.set('source', 'active-release')
  } else {
    parameters.set('source', 'draft-ref')
    if (input.draftRef !== undefined) parameters.set('draftRef', input.draftRef)
  }

  // Fetch the checkout manifest from Connector API
  const source = await connectorGet(site, `site-checkout?${parameters.toString()}`, signal)
  const files = Array.isArray(source.files) ? source.files : null
  if (files === null) {
    throw failure(
      'Connector returned an invalid checkout source.',
      'zeroy_checkout_source_invalid',
    )
  }

  const checkoutId = randomUUID()
  const cwd = (ctx as unknown as { cwd?: string }).cwd ?? process.cwd()
  const root = nodePath.join(
    cwd,
    '.zeroy-checkouts',
    `${safeCheckoutLabel(connection.label)}-${checkoutId}`,
  )

  // Create checkout directory
  await fs.mkdir(root, { recursive: true })

  // Download blob objects and materialize them as local files
  for (const item of files) {
    const file = asRecord(item)
    const relative = file && typeof file.path === 'string' ? file.path : ''
    const hash = file && typeof file.hash === 'string' ? file.hash : ''
    if (!checkoutPathIsSafe(relative) || !/^sha256:[a-f0-9]{64}$/.test(hash)) {
      throw failure(
        'Connector checkout manifest contains an invalid file.',
        'zeroy_checkout_source_invalid',
      )
    }
    const bytes = await fetchObject(connection, input.siteId, hash, signal)
    const target = nodePath.join(root, ...relative.split('/'))
    await fs.mkdir(nodePath.dirname(target), { recursive: true })
    await fs.writeFile(target, bytes)
  }

  const observedCommit =
    typeof source.commit === 'string' ? (source.commit as ObjectHash) : null

  const descriptor: CheckoutDescriptor = {
    contract: 'zeroy/checkout@1',
    siteId: input.siteId,
    checkoutId,
    remoteRef:
      input.source === 'active-release'
        ? `refs/drafts/connector/${checkoutId}`
        : (input.draftRef ?? ''),
    observedCommit,
    expectedRefCommit: input.source === 'active-release' ? null : observedCommit,
    baseReleaseId: typeof source.baseReleaseId === 'string' ? source.baseReleaseId : null,
    materializedAt: new Date().toISOString(),
  }

  const buildId = workspaceBuildId(source.build)
  if (buildId === null) {
    throw failure(
      'Connector checkout source did not identify its BuildResult.',
      'zeroy_build_result_missing',
    )
  }

  // Write the checkout descriptor (.zeroy/checkout.json)
  await writeJson(descriptorPath(root), descriptor)

  // Initialize a local Git repo
  await runGit(root, ['init'])

  // Exclude derived WorkspaceProjection from local Git
  await fs.writeFile(
    nodePath.join(root, '.git', 'info', 'exclude'),
    '.zeroy/\n',
    'utf8',
  )

  // Record the baseline Git commit with zeroY metadata
  if (observedCommit !== null && typeof source.tree === 'string') {
    await recordZeroYGitCommit(
      root,
      'zeroY checkout baseline',
      observedCommit,
      source.tree as ObjectHash,
      descriptor.baseReleaseId,
      descriptor.remoteRef,
    )
  }

  if (observedCommit === null) {
    throw failure(
      'Connector checkout source did not identify its exact SiteCommit.',
      'zeroy_site_commit_missing',
    )
  }

  // Replace workspace projection (writes .zeroy/ derived files and authored seeds)
  await replaceWorkspaceProjection(
    connection,
    input.siteId,
    root,
    observedCommit,
    buildId,
    input.source === 'active-release' ? 'baseline' : 'owned-draft',
    signal,
  )

  return {
    checkoutId,
    path: root,
    commit: observedCommit?.slice(0, 19) ?? null,
    fileCount: files.length,
  }
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * Register the `zeroy_checkout` tool on the given context.
 * @param ctx - plugin context that owns the tool registry; no-ops when schema projection failed.
 */
export function registerCheckoutTool(ctx: Context): void {
  if (CheckoutProviderProjection._tag === 'Failure') {
    ctx.logger.warn(
      'tool-zeroy: zeroy_checkout disabled — schema projection failed: %s',
      CheckoutProviderProjection.error.message,
    )
    return
  }

  // DSH-native parameter schema. Full validation happens inside execute via decodeCheckoutInput.
  const parameters = {
    siteId: { type: 'string' as const, required: true as const, description: 'Configured zeroY site identifier.' },
    source: { type: 'string' as const, required: true as const, description: 'One of: active-release, draft-ref.' },
    draftRef: { type: 'string' as const, description: 'Required when source = draft-ref. Pattern: refs/drafts/...' },
  }

  ctx.tools.register(defineTool({
    name: 'zeroy_checkout',
    description: CHECKOUT_DESCRIPTION,
    parameters,
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => false,
    async execute(args: unknown, exec: { signal?: AbortSignal }) {
      const decoded = decodeCheckoutInput(args)
      if (decoded._tag === 'Failure') {
        throw new Error(decoded.error.message)
      }

      const input = decoded.value
      const gate = getMutationGate()

      // Serialize writes per site via the mutation gate
      const result = await gate.withGate(input.siteId, () =>
        performCheckout(ctx, input, exec.signal),
      )

      return {
        checkoutId: result.checkoutId,
        path: result.path,
        commit: result.commit,
        fileCount: result.fileCount,
      }
    },
  } as never))
}
