import { describe, expect, it, vi } from 'vitest'
import {
  LEGACY_OWNER_CREDENTIAL_REF,
  mintOwnerSecret,
  OWNER_CREDENTIAL_REF,
  pinOwnerSecret,
  resolveOwnerSecret,
} from '../src/owner-credential.ts'

const HEX_A = 'aa'.repeat(32)
const HEX_B = 'bb'.repeat(32)

describe('resolveOwnerSecret', () => {
  it('returns the current reference before the legacy name or env', async () => {
    const store = vi.fn()
    const value = await resolveOwnerSecret(
      {
        resolve: async ref => ref === OWNER_CREDENTIAL_REF ? HEX_A : HEX_B,
        store,
      },
      { [OWNER_CREDENTIAL_REF]: HEX_B, [LEGACY_OWNER_CREDENTIAL_REF]: HEX_B },
      OWNER_CREDENTIAL_REF,
      LEGACY_OWNER_CREDENTIAL_REF,
    )
    expect(value).toBe(HEX_A)
    expect(store).not.toHaveBeenCalled()
  })

  it('writes the legacy secret under the current name and returns it', async () => {
    const store = vi.fn()
    const value = await resolveOwnerSecret(
      {
        resolve: async ref => ref === LEGACY_OWNER_CREDENTIAL_REF ? HEX_B : undefined,
        store,
      },
      {},
      OWNER_CREDENTIAL_REF,
      LEGACY_OWNER_CREDENTIAL_REF,
    )
    expect(value).toBe(HEX_B)
    expect(store).toHaveBeenCalledWith(OWNER_CREDENTIAL_REF, HEX_B)
  })

  it('keeps the legacy secret when write-back fails', async () => {
    const value = await resolveOwnerSecret(
      {
        resolve: async ref => ref === LEGACY_OWNER_CREDENTIAL_REF ? HEX_B : undefined,
        store: async () => {
          throw new Error('store rejected')
        },
      },
      {},
      OWNER_CREDENTIAL_REF,
      LEGACY_OWNER_CREDENTIAL_REF,
    )
    expect(value).toBe(HEX_B)
  })

  it('skips the legacy name when both references are the same', async () => {
    const resolve = vi.fn(async () => undefined)
    const value = await resolveOwnerSecret(
      { resolve },
      { [OWNER_CREDENTIAL_REF]: HEX_A },
      OWNER_CREDENTIAL_REF,
      OWNER_CREDENTIAL_REF,
    )
    expect(value).toBe(HEX_A)
    expect(resolve).toHaveBeenCalledOnce()
  })

  it('reads the legacy environment name after an empty store', async () => {
    const value = await resolveOwnerSecret(
      { resolve: async () => undefined },
      { [LEGACY_OWNER_CREDENTIAL_REF]: HEX_B },
      OWNER_CREDENTIAL_REF,
      LEGACY_OWNER_CREDENTIAL_REF,
    )
    expect(value).toBe(HEX_B)
  })

  it('returns undefined when every layer is empty', async () => {
    const value = await resolveOwnerSecret(
      { resolve: async () => '' },
      { [OWNER_CREDENTIAL_REF]: '' },
      OWNER_CREDENTIAL_REF,
      OWNER_CREDENTIAL_REF,
    )
    expect(value).toBeUndefined()
  })
})

describe('pinOwnerSecret', () => {
  it('invokes the factory once across concurrent callers', async () => {
    let loads = 0
    const pinned = pinOwnerSecret(async () => {
      loads += 1
      return HEX_A
    })
    const [first, second] = await Promise.all([pinned(), pinned()])
    expect(first).toBe(HEX_A)
    expect(second).toBe(HEX_A)
    expect(loads).toBe(1)
  })
})

describe('mintOwnerSecret', () => {
  it('returns 64 lowercase hex characters', () => {
    expect(mintOwnerSecret()).toMatch(/^[a-f0-9]{64}$/)
  })
})
