import type * as SchemaIssue from 'effect/SchemaIssue'
import type { ProtocolFailure } from '../core/errors.js'

export const POLL_DIAGNOSTIC_LIMIT_CHARS = 2048
export const POLL_RESPONSE_INVALID_CODE = 'poll-response-invalid'

type DiagnosticIssue = { readonly path: ReadonlyArray<PropertyKey>; readonly message: string }

export const recoverPollCommandId = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  if (!('type' in value) || value.type !== 'command' || !('command' in value)) return undefined
  const command = value.command
  if (typeof command !== 'object' || command === null || Array.isArray(command)) return undefined
  return 'id' in command && typeof command.id === 'string' && command.id.length > 0
    ? command.id
    : undefined
}

export const summarizePollBodyForDiagnostic = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const summary: Record<string, unknown> = {}
  if ('type' in value && typeof value.type === 'string') summary.type = value.type
  if (!('command' in value)) return summary
  const command = value.command
  if (typeof command !== 'object' || command === null || Array.isArray(command)) return summary
  const commandSummary: Record<string, unknown> = {}
  if ('id' in command && typeof command.id === 'string') commandSummary.id = command.id
  if ('domain' in command && typeof command.domain === 'string') commandSummary.domain = command.domain
  if ('call' in command) {
    const call = command.call
    if (typeof call === 'object' && call !== null && !Array.isArray(call) && 'op' in call && typeof call.op === 'string') {
      commandSummary.call = { op: call.op }
    }
  }
  if (Object.keys(commandSummary).length > 0) summary.command = commandSummary
  return summary
}

const leafMessage = (tag: string): string => {
  switch (tag) {
    case 'InvalidType': return 'Invalid type'
    case 'InvalidValue': return 'Invalid value'
    case 'MissingKey': return 'Missing key'
    case 'UnexpectedKey': return 'Unexpected key'
    case 'Forbidden': return 'Forbidden'
    case 'OneOf': return 'Expected exactly one member to match'
    case 'Filter': return 'Failed filter'
    default: return tag.length > 0 ? tag : 'Schema issue'
  }
}

export const collectSecretFreeSchemaIssues = (
  issue: SchemaIssue.Issue,
  path: ReadonlyArray<PropertyKey> = [],
): ReadonlyArray<DiagnosticIssue> => {
  switch (issue._tag) {
    case 'Filter': {
      const nested = collectSecretFreeSchemaIssues(issue.issue, path)
      return nested.length > 0 ? nested : [{ path, message: leafMessage('Filter') }]
    }
    case 'Encoding': return collectSecretFreeSchemaIssues(issue.issue, path)
    case 'Pointer': return collectSecretFreeSchemaIssues(issue.issue, [...path, ...issue.path])
    case 'Composite':
    case 'AnyOf': return issue.issues.flatMap(child => collectSecretFreeSchemaIssues(child, path))
    default: return [{ path, message: leafMessage(issue._tag) }]
  }
}

const fieldPath = (path: ReadonlyArray<PropertyKey>): string =>
  path.length === 0
    ? 'root'
    : path.map(segment => typeof segment === 'symbol' ? segment.description ?? 'symbol' : String(segment)).join('.')

export const formatPollDecodeDiagnostic = (
  issues: ReadonlyArray<DiagnosticIssue>,
  summary: Readonly<Record<string, unknown>>,
): string => {
  const lines = issues.map(issue => `${fieldPath(issue.path)}: ${issue.message}`)
  if (lines.length === 0) lines.push('root: Invalid poll response')
  lines.push(`summary: ${JSON.stringify(summary)}`)
  const text = lines.join('\n')
  return text.length <= POLL_DIAGNOSTIC_LIMIT_CHARS
    ? text
    : `${text.slice(0, POLL_DIAGNOSTIC_LIMIT_CHARS - 1)}…`
}

export const tryParsePollJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text) as unknown
  } catch {
    // Malformed JSON has no recoverable command identifier.
    return undefined
  }
}

export const protocolFailureSchemaIssue = (
  error: ProtocolFailure,
): SchemaIssue.Issue | undefined => {
  const cause = error.cause
  return typeof cause === 'object' && cause !== null && '_tag' in cause
    ? cause as SchemaIssue.Issue
    : undefined
}
