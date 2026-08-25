import { describe, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as RoutePolicyInvariant from '../src/invariant.ts'

describe('subagent-route-policy invariant companion', () => {
  it('registers an empty installer on the invariant service', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry)
    await ctx.plugin(RoutePolicyInvariant)
  })
})
