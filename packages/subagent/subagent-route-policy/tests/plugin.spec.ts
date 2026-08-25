import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { baselineChildAgentOptions, resolveChildAgentOptions } from '@deepseek-ai/dsh-subagent'
import type { SubagentProvider } from '@deepseek-ai/dsh-subagent'
import SubagentRoutePolicy from '../src/index.ts'

const inProcess: SubagentProvider = {
  name: 'spawn',
  capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  inheritsParentContext: false,
  async start() {
    throw new Error('unused')
  },
}

describe('SubagentRoutePolicy', () => {
  it('provides ctx.subagentRoute and owns resolve-child-options', async () => {
    const ctx = new Context()
    await ctx.plugin(SubagentRoutePolicy)
    expect(ctx.subagentRoute.honors(inProcess)).toBe(true)
    expect(ctx.subagentRoute.descriptionSuffix()).toContain('list_models')
    expect(Object.keys(ctx.subagentRoute.parameters()).sort()).toEqual([
      'model',
      'provider',
      'reasoning_effort',
    ])

    const parent = {
      options: { provider: 'stale', model: 'stale-m', maxTokens: 64 },
      session: {
        requestHeader: () => ({
          config: {
            provider: 'active',
            model: 'active-m',
            reasoningEffort: ReasoningEffortId('max'),
          },
        }),
      },
      ctx,
    } as unknown as Agent

    expect(baselineChildAgentOptions(parent, undefined, 1)).toMatchObject({
      provider: 'stale',
      model: 'stale-m',
    })
    expect(resolveChildAgentOptions(parent, undefined, 1)).toMatchObject({
      provider: 'active',
      model: 'active-m',
      reasoningEffort: ReasoningEffortId('max'),
      maxTokens: 64,
      subagentDepth: 1,
    })
    expect(resolveChildAgentOptions(parent, { model: 'other' }, 2)).toEqual({
      provider: 'active',
      model: 'other',
      maxTokens: 64,
      subagentDepth: 2,
    })
  })

  it('resolves per-call routes through the service', async () => {
    const ctx = new Context()
    await ctx.plugin(SubagentRoutePolicy)
    const parent = {
      id: SessionId('p'),
      options: { provider: 'zai-coding-cn', model: 'glm-5.3' },
      session: { requestHeader: () => undefined },
      ctx,
    } as unknown as Agent
    await expect(ctx.subagentRoute.resolve({
      parent,
      transport: inProcess,
      args: {},
      configAgentOptions: { maxTokens: 32 },
      llm: undefined,
      signal: new AbortController().signal,
    })).resolves.toEqual({ maxTokens: 32 })
  })
})
