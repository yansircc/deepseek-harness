import { describe, expect, it } from 'vitest'
import { parameterSchemaSpecToJsonSchema, validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'
import { ATOMIC_TOOL_DESCRIPTORS } from '../src/protocol/operations.ts'

const activate = ATOMIC_TOOL_DESCRIPTORS.find(tool => tool.name === 'chrome_tab_activate')
if (activate === undefined) throw new Error('chrome_tab_activate is missing')
const schema = parameterSchemaSpecToJsonSchema(activate.parameters)

describe('chrome_tab_activate target.value', () => {
  it('accepts the integer id chrome_tab_list returns', () => {
    expect(validateJsonSchemaValue(schema, {
      target: { by: 'id', value: 1688033173 },
    }, '')).toEqual([])
  })

  it('still accepts a URL string', () => {
    expect(validateJsonSchemaValue(schema, {
      target: { by: 'url', value: 'https://example.com/' },
    }, '')).toEqual([])
  })

  it('coerces a digit-string id onto the wire Target', () => {
    expect(activate.projectInput({
      target: { by: 'id', value: '1688033173' },
    })).toEqual({
      op: 'activate',
      target: { by: 'id', value: 1688033173 },
    })
  })

  it('leaves a URL target and a missing target unchanged', () => {
    expect(activate.projectInput({
      target: { by: 'url', value: 'https://example.com/' },
    })).toEqual({
      op: 'activate',
      target: { by: 'url', value: 'https://example.com/' },
    })
    expect(activate.projectInput({})).toEqual({ op: 'activate' })
  })

  it('leaves non-object, array, non-digit, and unsafe-integer targets unchanged', () => {
    expect(activate.projectInput({ target: 'x' })).toEqual({ op: 'activate', target: 'x' })
    expect(activate.projectInput({ target: null })).toEqual({ op: 'activate', target: null })
    expect(activate.projectInput({ target: [] })).toEqual({ op: 'activate', target: [] })
    expect(activate.projectInput({
      target: { by: 'id', value: 'not-an-id' },
    })).toEqual({
      op: 'activate',
      target: { by: 'id', value: 'not-an-id' },
    })
    expect(activate.projectInput({
      target: { by: 'id', value: '9007199254740993' },
    })).toEqual({
      op: 'activate',
      target: { by: 'id', value: '9007199254740993' },
    })
  })
})
