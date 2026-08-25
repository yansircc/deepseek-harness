import { describe, expect, it } from 'vitest'
import { compatibleKernel, chromeProtocolRevision } from '../src/index.ts'

describe('Chrome protocol revisions', () => {
  it('brands the revision tuple and compares only the stable kernel', () => {
    const first = chromeProtocolRevision('1', 'build-a', 'ops-a')
    const second = chromeProtocolRevision('1', 'build-b', 'ops-b')
    expect(first).toEqual({ kernelProtocolVersion: '1', kernelBuildId: 'build-a', operationRevision: 'ops-a' })
    expect(compatibleKernel(first, second)).toBe(true)
  })

  it('rejects incompatible kernel versions', () => {
    expect(compatibleKernel(chromeProtocolRevision('1', 'a', 'x'), chromeProtocolRevision('2', 'b', 'y'))).toBe(false)
  })
})
