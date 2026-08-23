import { describe, expect, it } from 'vitest'
import {
  ATOMIC_TOOL_DESCRIPTORS,
  OPERATION_CONTRACTS,
  atomicToolDescriptor,
  operationResultProtocolContract,
} from '../src/protocol/operations.ts'

describe('chrome automation system tools', () => {
  it('registers status and clear-stale as system-domain atomic descriptors', () => {
    expect(ATOMIC_TOOL_DESCRIPTORS).toHaveLength(27)

    const status = atomicToolDescriptor('chrome_automation_status')
    const clearStale = atomicToolDescriptor('chrome_automation_clear_stale')
    expect(status).toMatchObject({
      domain: 'system',
      operation: 'automation-status',
    })
    expect(clearStale).toMatchObject({
      domain: 'system',
      operation: 'clear-stale',
    })
    expect(clearStale?.description).toContain('without closing or adopting tabs')
    expect(status?.projectInput({})).toEqual({ op: 'automation-status' })
    expect(clearStale?.projectInput({})).toEqual({ op: 'clear-stale' })
  })

  it('projects clear-stale into host operation result and deadline contracts', () => {
    expect(OPERATION_CONTRACTS.system?.['clear-stale']).toMatchObject({
      domain: 'system',
      operation: 'clear-stale',
      deadline: 'default',
      result: {
        mode: 'schema',
        schema: {
          type: 'object',
          properties: { staleOwnershipsCleared: { type: 'integer' } },
        },
      },
    })
    expect(OPERATION_CONTRACTS.system?.['automation-status']).toMatchObject({
      domain: 'system',
      operation: 'automation-status',
      deadline: 'default',
    })
    expect(operationResultProtocolContract.system?.['clear-stale']).toMatchObject({
      mode: 'schema',
      deadline: 'default',
      schema: {
        type: 'object',
        properties: { staleOwnershipsCleared: { type: 'integer' } },
      },
    })
    expect(OPERATION_CONTRACTS.system?.cleanup).toBeDefined()
    expect(OPERATION_CONTRACTS.system?.['cleanup-all']).toBeDefined()
  })
})
