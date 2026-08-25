import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'

describe('chrome-local config', () => {
  it('resolves bounded loopback defaults', () => {
    expect(resolveConfig({})).toMatchObject({ host: '127.0.0.1', port: 17318, commandTimeoutMs: 30000 })
  })
  it.each([
    [{ host: '0.0.0.0' }, /loopback/],
    [{ port: 0 }, /port/],
    [{ commandTimeoutMs: 99 }, /commandTimeoutMs/],
    [{ maxAdmittedCommands: 0 }, /maxAdmittedCommands/],
    [{ ownerCredentialRef: 'bad-name' }, /POSIX/],
  ] as const)('rejects invalid config %o', (config, error) => {
    expect(() => resolveConfig(config)).toThrow(error)
  })
})
