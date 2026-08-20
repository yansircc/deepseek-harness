import { createHash } from 'node:crypto'

/** Content-addressed object id: `sha256:` plus 64 lowercase hex digits. */
export type ObjectHash = `sha256:${string}`

/** One name in a site tree: blob or nested tree, with mode and object hash. */
export type SiteTreeEntry = {
  readonly name: string
  readonly kind: 'blob' | 'tree'
  readonly hash: ObjectHash
  readonly mode: 'file' | 'executable'
}

/** `zeroy/site-commit@1` object: tree, at most one parent, author, message, and timestamp. */
export type SiteCommit = {
  readonly contract: 'zeroy/site-commit@1'
  readonly tree: ObjectHash
  readonly parents: readonly ObjectHash[]
  readonly baseReleaseId: string | null
  readonly author: {
    readonly principal: string
    readonly actorSessionId: string
  }
  readonly message: string
  readonly createdAt: string
}

/** Failure from canonical JSON, tree-entry, or site-commit validation. */
export class SiteObjectAlgebraError extends Error {
  /** Which algebra check failed. */
  readonly code: 'canonical_json_invalid' | 'tree_entry_invalid' | 'site_commit_invalid'

  constructor(opts: {
    code: 'canonical_json_invalid' | 'tree_entry_invalid' | 'site_commit_invalid'
    message: string
  }) {
    super(opts.message)
    this.name = 'SiteObjectAlgebraError'
    this.code = opts.code
  }
}

/** Tagged algebra result; Failure carries `SiteObjectAlgebraError` instead of throwing. */
export type SiteObjectResult<A> =
  | { readonly _tag: 'Success'; readonly value: A }
  | { readonly _tag: 'Failure'; readonly error: SiteObjectAlgebraError }

const success = <A>(value: A): SiteObjectResult<A> => ({ _tag: 'Success', value })
const failure = <A = never>(
  code: SiteObjectAlgebraError['code'],
  message: string,
): SiteObjectResult<A> => ({
  _tag: 'Failure',
  error: new SiteObjectAlgebraError({ code, message }),
})

const mapResult = <A, B>(
  result: SiteObjectResult<A>,
  transform: (value: A) => B,
): SiteObjectResult<B> => (result._tag === 'Failure' ? result : success(transform(result.value)))

const flatMapResult = <A, B>(
  result: SiteObjectResult<A>,
  transform: (value: A) => SiteObjectResult<B>,
): SiteObjectResult<B> => (result._tag === 'Failure' ? result : transform(result.value))

const recordWithKeys = (
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const record = value as Readonly<Record<string, unknown>>
  const actual = Object.keys(record).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
    ? record
    : null
}

const hashBytes = (bytes: Uint8Array): ObjectHash =>
  `sha256:${createHash('sha256').update(bytes).digest('hex')}`

const domainBytes = (domain: string, bytes: Uint8Array): Uint8Array => {
  const prefix = new TextEncoder().encode(`${domain}\0${bytes.byteLength}\0`)
  const input = new Uint8Array(prefix.byteLength + bytes.byteLength)
  input.set(prefix)
  input.set(bytes, prefix.byteLength)
  return input
}

const canonicalValue = (value: unknown): SiteObjectResult<unknown> => {
  if (Array.isArray(value)) {
    const values: unknown[] = []
    for (const entry of value) {
      const canonical = canonicalValue(entry)
      if (canonical._tag === 'Failure') return canonical
      values.push(canonical.value)
    }
    return success(values)
  }
  if (value !== null && typeof value === 'object') {
    const entries: Array<readonly [string, unknown]> = []
    for (const [key, entry] of Object.entries(value as Readonly<Record<string, unknown>>).sort(
      ([left], [right]) => Buffer.from(left).compare(Buffer.from(right)),
    )) {
      const canonical = canonicalValue(entry)
      if (canonical._tag === 'Failure') return canonical
      entries.push([key, canonical.value])
    }
    return success(Object.fromEntries(entries))
  }
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === null ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return success(value)
  }
  return failure('canonical_json_invalid', 'Canonical JSON accepts only finite JSON values.')
}

/**
 * Canonicalize a finite JSON value: sorted object keys, no NaN or Infinity.
 * @param value - JSON-compatible value to canonicalize.
 * @returns Success with the canonical JSON string, or Failure when the value is not finite JSON.
 */
export const canonicalJson = (value: unknown): SiteObjectResult<string> =>
  mapResult(canonicalValue(value), canonical => JSON.stringify(canonical))

/**
 * Normalize checkout text to LF line endings. Other bytes are unchanged.
 * @param content - file text from a checkout.
 * @returns the same text with CR/LF and CR rewritten to LF.
 */
export const normalizeCheckoutText = (content: string): string =>
  content.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

/**
 * Parse checkout text as JSON and encode the canonical document plus a trailing newline.
 * @param content - checkout file text.
 * @returns Success with UTF-8 bytes, or Failure when parse or canonicalization fails.
 */
export const canonicalJsonDocument = (content: string): SiteObjectResult<Uint8Array> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(normalizeCheckoutText(content))
  } catch {
    return failure('canonical_json_invalid', 'Checkout JSON is not valid JSON.')
  }
  const encoded = canonicalJson(parsed)
  if (encoded._tag === 'Failure') return encoded
  return success(new TextEncoder().encode(`${encoded.value}\n`))
}

/**
 * Hash blob bytes under the `blob` domain prefix.
 * @param bytes - raw blob contents.
 * @returns `sha256:` hash of the domain-prefixed bytes.
 */
export const blobHash = (bytes: Uint8Array): ObjectHash => hashBytes(domainBytes('blob', bytes))

/**
 * Validate tree entries: unique safe names and well-formed hashes; sort by name.
 * @param entries - candidate tree entries.
 * @returns Success with a new sorted array, or Failure on unsafe, duplicate, or invalid entries.
 */
export const normalizeTreeEntries = (
  entries: readonly SiteTreeEntry[],
): SiteObjectResult<readonly SiteTreeEntry[]> => {
  const names = new Set<string>()
  const normalized: SiteTreeEntry[] = []
  for (const entry of entries) {
    if (!checkoutSegmentIsSafe(entry.name))
      return failure('tree_entry_invalid', `Unsafe tree entry: ${entry.name}`)
    if (names.has(entry.name))
      return failure('tree_entry_invalid', `Duplicate tree entry: ${entry.name}`)
    if (!/^sha256:[a-f0-9]{64}$/.test(entry.hash))
      return failure('tree_entry_invalid', 'Invalid object hash.')
    names.add(entry.name)
    normalized.push({ ...entry })
  }
  return success(
    normalized.sort((left, right) => Buffer.from(left.name).compare(Buffer.from(right.name))),
  )
}

/**
 * Encode a tree as canonical JSON bytes after normalizing entries.
 * @param entries - candidate tree entries.
 * @returns Success with UTF-8 bytes, or Failure from normalize or canonicalize.
 */
export const treeBytes = (entries: readonly SiteTreeEntry[]): SiteObjectResult<Uint8Array> =>
  flatMapResult(normalizeTreeEntries(entries), normalized =>
    mapResult(canonicalJson(normalized), encoded => new TextEncoder().encode(encoded)),
  )

/**
 * Hash a tree under the `tree` domain prefix after normalizing entries.
 * @param entries - candidate tree entries.
 * @returns Success with the tree `ObjectHash`, or Failure from normalize or canonicalize.
 */
export const treeHash = (entries: readonly SiteTreeEntry[]): SiteObjectResult<ObjectHash> =>
  mapResult(treeBytes(entries), bytes => hashBytes(domainBytes('tree', bytes)))

/**
 * Decode an unknown value as `zeroy/site-commit@1`. Extra keys fail. At most one parent.
 * @param value - candidate commit object.
 * @returns Success with `SiteCommit`, or Failure when the value violates the object.
 */
export const decodeSiteCommit = (value: unknown): SiteObjectResult<SiteCommit> => {
  const commit = recordWithKeys(value, [
    'contract',
    'tree',
    'parents',
    'baseReleaseId',
    'author',
    'message',
    'createdAt',
  ])
  const author = recordWithKeys(commit?.author, ['principal', 'actorSessionId'])
  const parents = commit?.parents
  if (
    commit?.contract !== 'zeroy/site-commit@1' ||
    typeof commit.tree !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/.test(commit.tree) ||
    !Array.isArray(parents) ||
    parents.length > 1 ||
    parents.some(parent => typeof parent !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(parent)) ||
    (commit.baseReleaseId !== null && typeof commit.baseReleaseId !== 'string') ||
    author === null ||
    typeof author.principal !== 'string' ||
    author.principal.length === 0 ||
    typeof author.actorSessionId !== 'string' ||
    author.actorSessionId.length === 0 ||
    typeof commit.message !== 'string' ||
    typeof commit.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(commit.createdAt))
  ) {
    return failure('site_commit_invalid', 'Value violates zeroy/site-commit@1.')
  }
  return success(commit as SiteCommit)
}

/**
 * Re-encode a commit through decode and canonical JSON so hash input is closed.
 * @param commit - commit to serialize.
 * @returns Success with UTF-8 bytes, or Failure when the commit is invalid.
 */
export const commitBytes = (commit: SiteCommit): SiteObjectResult<Uint8Array> =>
  flatMapResult(decodeSiteCommit(commit), decoded =>
    mapResult(canonicalJson(decoded), encoded => new TextEncoder().encode(encoded)),
  )

/**
 * Hash a commit under the `commit` domain prefix.
 * @param commit - commit to hash.
 * @returns Success with the commit `ObjectHash`, or Failure when the commit is invalid.
 */
export const commitHash = (commit: SiteCommit): SiteObjectResult<ObjectHash> =>
  mapResult(commitBytes(commit), bytes => hashBytes(domainBytes('commit', bytes)))

/**
 * Hash a push request under the `push-request` domain; returns 64 hex digits without the `sha256:` prefix.
 * @param request - request object to canonicalize and hash.
 * @returns Success with the hex digest, or Failure when canonicalization fails.
 */
export const pushRequestHash = (request: unknown): SiteObjectResult<string> =>
  mapResult(canonicalJson(request), encoded =>
    hashBytes(domainBytes('push-request', new TextEncoder().encode(encoded))).slice(7),
  )

/**
 * True when a single path segment is safe for checkout: non-empty, not `.`/`..`, no separators or NUL, at most 255 bytes.
 * @param segment - one path component.
 * @returns whether the segment may appear in a checkout path or tree name.
 */
export const checkoutSegmentIsSafe = (segment: string): boolean =>
  segment.length > 0 &&
  segment !== '.' &&
  segment !== '..' &&
  !segment.includes('/') &&
  !segment.includes('\\') &&
  !segment.includes('\0') &&
  Buffer.byteLength(segment) <= 255

/**
 * True when a relative checkout path has no leading or trailing slash and every segment is safe.
 * @param path - relative path using `/` separators.
 * @returns whether the path may be written under a checkout root.
 */
export const checkoutPathIsSafe = (path: string): boolean =>
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.endsWith('/') &&
  path.split('/').every(checkoutSegmentIsSafe)
