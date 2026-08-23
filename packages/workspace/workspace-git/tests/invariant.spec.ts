import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as WorkspaceGitInvariant from '../src/invariant.ts'

describe('workspace-git invariant companion', () => {
  it('registers the empty companion', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry)
    await ctx.plugin(WorkspaceGitInvariant)
    expect(ctx.invariants).toBeDefined()
  })
})
