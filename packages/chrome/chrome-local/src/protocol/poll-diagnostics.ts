/**
 * Bounded, secret-free diagnostics for invalid Chrome bridge poll bodies.
 * Host tests own the helpers; the bundled service worker mirrors the same rules.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/poll-diagnostics
 */

/** Cap for poll-decode diagnostic text returned to the host or logged. */
export const POLL_DIAGNOSTIC_LIMIT_CHARS = 2048

/** Stable {@link WireCommandRejected} code for a schema-invalid poll command body. */
export const POLL_RESPONSE_INVALID_CODE = 'poll-response-invalid'

/** Secret-free summary of a poll JSON body for diagnostics. */
export type PollCommandSummary = {
  readonly type?: string
  readonly command?: {
    readonly id?: string
    readonly domain?: string
    readonly call?: { readonly op?: string }
  }
}

/** One formatted schema issue: dotted path plus leaf message without actual values. */
export type BoundedSchemaIssue = {
  readonly path: readonly string[]
  readonly message: string
}

/**
 * Recover a non-empty command id from a poll JSON value when `type === 'command'`.
 * @param value - parsed poll JSON, or undefined when parse failed.
 * @returns command id, or undefined when the id cannot be recovered safely.
 */
export const recoverPollCommandId = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (record.type !== 'command') return undefined
  const command = record.command
  if (typeof command !== 'object' || command === null || Array.isArray(command)) {
    return undefined
  }
  const id = (command as Record<string, unknown>).id
  return typeof id === 'string' && id.length > 0 ? id : undefined
}

/**
 * Build a secret-free poll summary: only `type` and `command.{id,domain,call.op}`.
 * @param value - parsed poll JSON.
 * @returns summary object safe to serialize into diagnostics.
 */
export const summarizePollBodyForDiagnostic = (value: unknown): PollCommandSummary => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const summary: {
    type?: string
    command?: { id?: string; domain?: string; call?: { op?: string } }
  } = {}
  if (typeof record.type === 'string') summary.type = record.type
  const command = record.command
  if (typeof command === 'object' && command !== null && !Array.isArray(command)) {
    const cmd = command as Record<string, unknown>
    const commandSummary: { id?: string; domain?: string; call?: { op?: string } } = {}
    if (typeof cmd.id === 'string') commandSummary.id = cmd.id
    if (typeof cmd.domain === 'string') commandSummary.domain = cmd.domain
    const call = cmd.call
    if (typeof call === 'object' && call !== null && !Array.isArray(call)) {
      const op = (call as Record<string, unknown>).op
      if (typeof op === 'string') commandSummary.call = { op }
    }
    if (Object.keys(commandSummary).length > 0) summary.command = commandSummary
  }
  return summary
}

/**
 * Format one schema path segment for diagnostics (keys only; never raw values).
 * @param segment - Effect Schema path segment.
 * @returns string form safe for diagnostics.
 */
export const formatDiagnosticPathSegment = (segment: unknown): string => {
  if (typeof segment === 'string') return segment
  if (typeof segment === 'number' && Number.isFinite(segment)) return String(segment)
  if (typeof segment === 'symbol') return segment.description ?? 'symbol'
  return '_'
}

/**
 * Join path segments as a dotted field path.
 * @param path - path segments from a schema issue walk.
 * @returns `root` when empty, otherwise dotted path.
 */
export const formatDiagnosticFieldPath = (path: readonly unknown[]): string => {
  if (path.length === 0) return 'root'
  return path.map(formatDiagnosticPathSegment).join('.')
}

/**
 * Secret-free leaf message for a schema issue tag (never includes actual values).
 * @param tag - Effect SchemaIssue `_tag`, or a precomputed leaf label.
 * @returns short message without expression/args/secrets.
 */
export const secretFreeSchemaLeafMessage = (tag: string): string => {
  switch (tag) {
    case 'InvalidType':
      return 'Invalid type'
    case 'InvalidValue':
      return 'Invalid value'
    case 'MissingKey':
      return 'Missing key'
    case 'UnexpectedKey':
      return 'Unexpected key'
    case 'Forbidden':
      return 'Forbidden'
    case 'OneOf':
      return 'Expected exactly one member to match'
    case 'Filter':
      return 'Failed filter'
    default:
      return tag.length > 0 ? tag : 'Schema issue'
  }
}

/**
 * Truncate diagnostic text to {@link POLL_DIAGNOSTIC_LIMIT_CHARS}.
 * @param text - full diagnostic.
 * @param limit - character cap (default 2048).
 * @returns text, or a truncated prefix ending with an ellipsis marker.
 */
export const boundDiagnosticText = (
  text: string,
  limit: number = POLL_DIAGNOSTIC_LIMIT_CHARS,
): string => {
  if (text.length <= limit) return text
  if (limit <= 1) return '…'
  return `${text.slice(0, limit - 1)}…`
}

/**
 * Format bounded schema issues plus an optional command summary.
 * @param issues - path/message pairs (already secret-free).
 * @param summary - `{type, command:{id/domain/call.op}}` only.
 * @returns diagnostic text capped at {@link POLL_DIAGNOSTIC_LIMIT_CHARS}.
 */
export const formatPollDecodeDiagnostic = (
  issues: readonly BoundedSchemaIssue[],
  summary: PollCommandSummary,
): string => {
  const lines: string[] = []
  for (const issue of issues) {
    const path = formatDiagnosticFieldPath(issue.path)
    lines.push(`${path}: ${issue.message}`)
  }
  if (lines.length === 0) lines.push('root: Invalid poll response')
  lines.push(`summary: ${JSON.stringify(summary)}`)
  return boundDiagnosticText(lines.join('\n'))
}

/**
 * Build the WireResult error payload for a recoverable invalid poll command.
 * @param message - bounded diagnostic text.
 * @returns CommandRejected fields (caller supplies `id` on the WireResult).
 */
export const pollResponseInvalidRejection = (
  message: string,
): {
  readonly _tag: 'CommandRejected'
  readonly code: typeof POLL_RESPONSE_INVALID_CODE
  readonly message: string
} => ({
  _tag: 'CommandRejected',
  code: POLL_RESPONSE_INVALID_CODE,
  message: boundDiagnosticText(message),
})
