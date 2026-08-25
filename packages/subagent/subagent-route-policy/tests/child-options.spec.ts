import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { resolveActiveChildAgentOptions } from '../src/child-options.ts'

describe('resolveActiveChildAgentOptions', () => {
  it('inherits the logged ACTIVE route when create-time options are absent', () => {
    const parent = {
      options: {},
      session: {
        requestHeader: () => ({ config: { provider: 'mock', model: 'active-route-model' } }),
      },
      ctx: { get: () => undefined },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, undefined, 1))
      .toMatchObject({ provider: 'mock', model: 'active-route-model', subagentDepth: 1 })
  })

  it('prefers the logged ACTIVE route over create-time AgentOptions', () => {
    const parent = {
      options: { provider: 'stale-default', model: 'stale-default-model' },
      session: {
        requestHeader: () => ({ config: { provider: 'active-provider', model: 'active-model' } }),
      },
      ctx: { get: () => ({ currentSelection: () => ({ provider: 'unused-default', model: 'unused' }) }) },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, undefined, 1))
      .toMatchObject({ provider: 'active-provider', model: 'active-model', subagentDepth: 1 })
  })

  it('inherits the parent active reasoning effort when the child stays on that route', () => {
    const parent = {
      options: { provider: 'mock', model: 'm', reasoningEffort: ReasoningEffortId('high') },
      session: {
        requestHeader: () => ({
          config: { provider: 'mock', model: 'm', reasoningEffort: ReasoningEffortId('max') },
        }),
      },
      ctx: { get: () => undefined },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, undefined, 1)).toMatchObject({
      provider: 'mock',
      model: 'm',
      reasoningEffort: ReasoningEffortId('max'),
      subagentDepth: 1,
    })
  })

  it('drops inherited reasoning effort when the request changes provider or model', () => {
    const parent = {
      options: { provider: 'mock', model: 'm', reasoningEffort: ReasoningEffortId('max') },
      session: {
        requestHeader: () => ({
          config: { provider: 'mock', model: 'm', reasoningEffort: ReasoningEffortId('max') },
        }),
      },
      ctx: { get: () => undefined },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, { model: 'other' }, 1)).toEqual({
      provider: 'mock',
      model: 'other',
      subagentDepth: 1,
    })
    expect(resolveActiveChildAgentOptions(parent, {
      provider: 'other',
      model: 'm',
      reasoningEffort: ReasoningEffortId('high'),
    }, 1)).toMatchObject({
      provider: 'other',
      model: 'm',
      reasoningEffort: ReasoningEffortId('high'),
    })
  })

  it('falls back to agentDefaultModel only when the parent has neither an explicit model nor a logged route', () => {
    const parent = {
      options: {},
      session: { requestHeader: () => undefined },
      ctx: { get: () => ({ currentSelection: () => ({ provider: 'default-p', model: 'default-m' }) }) },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, undefined, 1))
      .toMatchObject({ provider: 'default-p', model: 'default-m' })
  })

  it('omits provider and model when neither parent, log, nor default supplies them', () => {
    const parent = {
      options: {},
      session: { requestHeader: () => undefined },
      ctx: { get: () => undefined },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, undefined, 1)).toEqual({ subagentDepth: 1 })
  })

  it('inherits parent maxTokens and lets the request override it', () => {
    const parent = {
      options: { provider: 'p', model: 'm', maxTokens: 128 },
      session: { requestHeader: () => undefined },
      ctx: { get: () => undefined },
    } as unknown as Agent
    expect(resolveActiveChildAgentOptions(parent, { maxTokens: 256 }, 1)).toEqual({
      provider: 'p',
      model: 'm',
      maxTokens: 256,
      subagentDepth: 1,
    })
  })
})
