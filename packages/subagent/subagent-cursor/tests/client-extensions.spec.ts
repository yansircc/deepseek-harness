import { describe, expect, it } from 'vitest'
import { RequestError } from '@agentclientprotocol/sdk'
import {
  acknowledgeCursorClientExtension,
  isCursorClientExtension,
} from '../src/client-extensions.ts'

describe('isCursorClientExtension', () => {
  it('accepts the Cursor editor prefix and rejects other methods', () => {
    expect(isCursorClientExtension('cursor/update_todos')).toBe(true)
    expect(isCursorClientExtension('cursor/future_thing')).toBe(true)
    expect(isCursorClientExtension('session/update')).toBe(false)
    expect(isCursorClientExtension('update_todos')).toBe(false)
  })
})

describe('acknowledgeCursorClientExtension', () => {
  it('returns an empty object for every cursor/ method', () => {
    expect(acknowledgeCursorClientExtension('cursor/update_todos')).toEqual({})
    expect(acknowledgeCursorClientExtension('cursor/future_thing')).toEqual({})
  })

  it('rejects an unmatched non-Cursor method as ACP method-not-found', () => {
    try {
      acknowledgeCursorClientExtension('other/foo')
      throw new Error('expected method-not-found')
    } catch (error) {
      expect(error).toBeInstanceOf(RequestError)
      expect((error as RequestError).code).toBe(-32601)
    }
  })
})
