/** One unresolved three-way conflict: file path, optional JSON pointer, and kind. */
export type MergeConflict = {
  readonly path: string
  readonly fieldPath?: string
  readonly kind: 'content' | 'delete-modify' | 'binary'
}

/** Three-way JSON merge: merged value plus JSON Pointers that still conflict. */
export type JsonMergeResult = {
  readonly value: unknown
  readonly conflicts: readonly string[]
}

const missing = Symbol('zeroy.merge.missing')
type Value =
  | string
  | number
  | boolean
  | null
  | readonly unknown[]
  | Record<string, unknown>
  | typeof missing

const isRecord = (value: Value): value is Record<string, unknown> =>
  value !== missing && typeof value === 'object' && value !== null && !Array.isArray(value)

const equal = (left: Value, right: Value): boolean => {
  if (left === missing || right === missing) return left === right
  return JSON.stringify(left) === JSON.stringify(right)
}

const pointerSegment = (value: string): string => value.replaceAll('~', '~0').replaceAll('/', '~1')

const mergeJsonValue = (
  base: Value,
  ours: Value,
  remote: Value,
  pointer: string,
): { readonly value: Value; readonly conflicts: readonly string[] } => {
  if (equal(ours, remote)) return { value: ours, conflicts: [] }
  if (equal(ours, base)) return { value: remote, conflicts: [] }
  if (equal(remote, base)) return { value: ours, conflicts: [] }
  if (isRecord(base) && isRecord(ours) && isRecord(remote)) {
    const keys = [
      ...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(remote)]),
    ].sort()
    const output: Record<string, unknown> = {}
    const conflicts: string[] = []
    for (const key of keys) {
      const child = mergeJsonValue(
        Object.hasOwn(base, key) ? (base[key] as Value) : missing,
        Object.hasOwn(ours, key) ? (ours[key] as Value) : missing,
        Object.hasOwn(remote, key) ? (remote[key] as Value) : missing,
        `${pointer}/${pointerSegment(key)}`,
      )
      conflicts.push(...child.conflicts)
      if (child.value !== missing) output[key] = child.value
    }
    return { value: output, conflicts }
  }
  return { value: ours, conflicts: [pointer || '/'] }
}

/**
 * Three-way merge of JSON values. Equal sides win; objects recurse by key; other
 * disagreements keep `ours` and record the pointer.
 * @param base - common ancestor value.
 * @param ours - local value.
 * @param remote - incoming value.
 * @returns merged value (`null` if the root vanished) and conflict pointers.
 */
export const mergeJsonDocuments = (
  base: unknown,
  ours: unknown,
  remote: unknown,
): JsonMergeResult => {
  const merged = mergeJsonValue(base as Value, ours as Value, remote as Value, '')
  return {
    value: merged.value === missing ? null : merged.value,
    conflicts: merged.conflicts,
  }
}

/**
 * Parse UTF-8 bytes as JSON. Throws `SyntaxError` on invalid JSON.
 * @param bytes - encoded JSON document.
 * @returns the parsed JSON value.
 */
export const decodeJsonDocument = (bytes: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(bytes)) as unknown

/**
 * Encode a JSON value as pretty-printed UTF-8 with a trailing newline.
 * @param value - JSON-serializable value.
 * @returns UTF-8 bytes.
 */
export const encodeJsonDocument = (value: unknown): Uint8Array =>
  new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)

/**
 * True when the path's extension is treated as mergeable text (php, css, js, html, md, txt, svg, and related).
 * @param path - relative checkout path.
 * @returns whether a content merge is attempted for this path.
 */
export const isMergeableTextPath = (path: string): boolean =>
  ['.php', '.css', '.js', '.mjs', '.cjs', '.html', '.md', '.txt', '.svg'].some(extension =>
    path.toLowerCase().endsWith(extension),
  )

/**
 * Classify an incomplete merge: `content` for mergeable text, `binary` otherwise.
 * @param path - relative checkout path.
 * @returns conflict kind for that path.
 */
export const incompleteMergeConflictKind = (path: string): 'content' | 'binary' =>
  isMergeableTextPath(path) ? 'content' : 'binary'

const normalizeCheckoutText = (content: string): string =>
  content.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

/**
 * Encode text as UTF-8 after normalizing CR/LF and CR to LF.
 * @param value - checkout or merge text.
 * @returns normalized UTF-8 bytes.
 */
export const normalizedTextBytes = (value: string): Uint8Array =>
  new TextEncoder().encode(normalizeCheckoutText(value))
