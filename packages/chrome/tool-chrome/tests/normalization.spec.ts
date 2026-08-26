import { describe, expect, it } from 'vitest'
import { ATOMIC_TOOL_DESCRIPTORS } from '../src/operations.ts'
import { projectChromeCommand } from '../src/index.ts'

describe('Chrome tool semantic normalization', () => {
  it('omits empty optional strings before command projection', () => {
    const descriptor = ATOMIC_TOOL_DESCRIPTORS.find(entry => entry.name === 'chrome_snapshot')!
    expect(projectChromeCommand(descriptor, {
      ref: '', query: '', containingText: '', role: '', nearUid: '', mode: 'interactive',
    })).toEqual({ domain: 'page', call: { op: 'snapshot', mode: 'interactive' } })
  })
})
