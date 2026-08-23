import { describe, expect, it } from 'vitest'
import {
  POLL_DIAGNOSTIC_LIMIT_CHARS,
  POLL_RESPONSE_INVALID_CODE,
  boundDiagnosticText,
  formatDiagnosticFieldPath,
  formatPollDecodeDiagnostic,
  pollResponseInvalidRejection,
  recoverPollCommandId,
  secretFreeSchemaLeafMessage,
  summarizePollBodyForDiagnostic,
} from '../src/protocol/poll-diagnostics.ts'

describe('poll-decode diagnostics', () => {
  it('recovers command id only for type:command with a non-empty id', () => {
    expect(
      recoverPollCommandId({
        type: 'command',
        command: { id: 'cmd-1', domain: 'page', call: { op: 'evaluate', expression: 'secret()' } },
      }),
    ).toBe('cmd-1')
    expect(recoverPollCommandId({ type: 'none' })).toBeUndefined()
    expect(recoverPollCommandId({ type: 'command', command: { id: '' } })).toBeUndefined()
    expect(recoverPollCommandId('not-json-object')).toBeUndefined()
  })

  it('summarizes only type and command id/domain/call.op without secrets', () => {
    const summary = summarizePollBodyForDiagnostic({
      type: 'command',
      command: {
        id: 'cmd-2',
        domain: 'page',
        call: {
          op: 'evaluate',
          expression: 'document.cookie',
          secret: 'should-not-appear',
        },
        proof: 'hmac-proof',
      },
      headers: { authorization: 'secret' },
    })
    expect(summary).toEqual({
      type: 'command',
      command: { id: 'cmd-2', domain: 'page', call: { op: 'evaluate' } },
    })
    expect(JSON.stringify(summary)).not.toMatch(/cookie|hmac|authorization|secret/i)
  })

  it('formats bounded field paths and secret-free leaf messages', () => {
    expect(formatDiagnosticFieldPath(['command', 'call', 'expression'])).toBe(
      'command.call.expression',
    )
    expect(secretFreeSchemaLeafMessage('InvalidType')).toBe('Invalid type')
    expect(secretFreeSchemaLeafMessage('MissingKey')).toBe('Missing key')

    const diagnostic = formatPollDecodeDiagnostic(
      [
        { path: ['command', 'call', 'expression'], message: 'Invalid type' },
        { path: ['command', 'call'], message: 'Unexpected key' },
      ],
      {
        type: 'command',
        command: { id: 'cmd-3', domain: 'page', call: { op: 'evaluate' } },
      },
    )
    expect(diagnostic).toContain('command.call.expression: Invalid type')
    expect(diagnostic).toContain('command.call: Unexpected key')
    expect(diagnostic).toContain('"op":"evaluate"')
    expect(diagnostic).not.toMatch(/document\.cookie|hmac|proof|expression":/i)
  })

  it('caps diagnostic text around 2KB', () => {
    const long = 'x'.repeat(POLL_DIAGNOSTIC_LIMIT_CHARS + 200)
    const bounded = boundDiagnosticText(long)
    expect(bounded.length).toBe(POLL_DIAGNOSTIC_LIMIT_CHARS)
    expect(bounded.endsWith('…')).toBe(true)

    const issues = Array.from({ length: 80 }, (_, index) => ({
      path: ['command', 'call', `field${index}`],
      message: 'Invalid type',
    }))
    const diagnostic = formatPollDecodeDiagnostic(issues, {
      type: 'command',
      command: { id: 'cmd-4', domain: 'input', call: { op: 'type' } },
    })
    expect(diagnostic.length).toBeLessThanOrEqual(POLL_DIAGNOSTIC_LIMIT_CHARS)
  })

  it('builds a stable poll-response-invalid CommandRejected payload', () => {
    const rejection = pollResponseInvalidRejection('command.call.op: Missing key\nsummary: {"type":"command"}')
    expect(rejection).toEqual({
      _tag: 'CommandRejected',
      code: POLL_RESPONSE_INVALID_CODE,
      message: expect.stringContaining('command.call.op: Missing key'),
    })
    expect(rejection.code).toBe('poll-response-invalid')
  })
})
