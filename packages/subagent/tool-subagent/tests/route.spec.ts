import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  LlmAdapter,
  ReasoningEffortId,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SubagentProvider } from '@deepseek-ai/dsh-subagent'
import {
  hasDelegationRouteArgs,
  honorsLlmRoute,
  resolveDelegationAgentOptions,
} from '../src/route.ts'

class CatalogAdapter extends LlmAdapter {
  constructor(
    private readonly modelsByProvider: Record<string, readonly LlmModelInfo[]>,
    private readonly resolved: Record<string, LlmResolvedModelInfo> = {},
  ) {
    super()
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve(this.modelsByProvider[provider] ?? [])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve(this.resolved[`${provider}/${model}`] ?? { provider, id: model, name: model })
  }

  async * stream(): AsyncIterable<StreamChunk> {
    throw new Error('CatalogAdapter does not stream')
  }
}

function fakeLlm(adapter: CatalogAdapter, providers: string[]) {
  return {
    listProviders: () => providers.map(id => ({ id, name: id })),
    listModels: (provider: string) => adapter.listModels(provider),
    resolveModelInfo: (provider: string, model: string, signal?: AbortSignal) =>
      adapter.resolveModel(provider, model, signal),
  }
}

function parentOn(route: {
  provider?: string
  model?: string
  reasoningEffort?: string
  header?: { provider?: string; model?: string; reasoningEffort?: string }
}): Agent {
  return {
    id: SessionId('parent-1'),
    options: {
      ...route.provider === undefined ? {} : { provider: route.provider },
      ...route.model === undefined ? {} : { model: route.model },
      ...route.reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(route.reasoningEffort) },
    },
    session: {
      requestHeader: () => route.header === undefined
        ? undefined
        : {
          config: {
            ...route.header.provider === undefined ? {} : { provider: route.header.provider },
            ...route.header.model === undefined ? {} : { model: route.header.model },
            ...route.header.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: ReasoningEffortId(route.header.reasoningEffort) },
          },
        },
    },
  } as unknown as Agent
}

const inProcess: SubagentProvider = {
  name: 'spawn',
  capabilities: { outputSchema: true, depthLimit: true, toolFilter: true, persona: true },
  inheritsParentContext: false,
  async start() {
    throw new Error('unused')
  },
}

const product: SubagentProvider = {
  name: 'cursor',
  capabilities: { outputSchema: false, depthLimit: true, toolFilter: false, persona: false },
  inheritsParentContext: false,
  async start() {
    throw new Error('unused')
  },
}

const zaiFlash: LlmModelInfo = { provider: 'zai-coding-cn', id: 'glm-5.3', name: 'GLM 5.3' }
const kimiK2: LlmModelInfo = { provider: 'kimi-coding', id: 'kimi-k2', name: 'Kimi K2' }

function catalog() {
  return fakeLlm(
    new CatalogAdapter(
      {
        'zai-coding-cn': [zaiFlash],
        'kimi-coding': [kimiK2],
      },
      {
        'zai-coding-cn/glm-5.3': {
          provider: 'zai-coding-cn',
          id: 'glm-5.3',
          name: 'GLM 5.3',
          reasoning: {
            efforts: [
              { id: ReasoningEffortId('high'), name: 'High' },
              { id: ReasoningEffortId('max'), name: 'Max' },
            ],
            defaultEffort: ReasoningEffortId('high'),
          },
        },
        'kimi-coding/kimi-k2': {
          provider: 'kimi-coding',
          id: 'kimi-k2',
          name: 'Kimi K2',
          reasoning: {
            efforts: [{ id: ReasoningEffortId('high'), name: 'High' }],
          },
        },
      },
    ),
    ['zai-coding-cn', 'kimi-coding'],
  )
}

const signal = new AbortController().signal

describe('delegation LLM route resolution', () => {
  it('treats in-process persona+toolFilter transports as route-honoring', () => {
    expect(honorsLlmRoute(inProcess)).toBe(true)
    expect(honorsLlmRoute(product)).toBe(false)
    expect(hasDelegationRouteArgs({})).toBe(false)
    expect(hasDelegationRouteArgs({ reasoning_effort: 'max' })).toBe(true)
  })

  it('returns configured agentOptions unchanged when the call names no route fields', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({}),
      transport: inProcess,
      args: {},
      configAgentOptions: { model: 'child-model' },
      llm: undefined,
      signal,
    })).resolves.toEqual({ model: 'child-model' })
  })

  it('rejects route fields on a product transport', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'zai-coding-cn', model: 'glm-5.3' }),
      transport: product,
      args: { model: 'kimi-k2' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).rejects.toThrow(/does not honor provider, model, or reasoning_effort/)
  })

  it('requires the LLM catalog when the call names a route field', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'zai-coding-cn', model: 'glm-5.3' }),
      transport: inProcess,
      args: { reasoning_effort: 'max' },
      configAgentOptions: undefined,
      llm: undefined,
      signal,
    })).rejects.toThrow('LLM catalog is unavailable')
  })

  it('inherits the parent active route and effort when only effort is omitted', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({
        provider: 'stale',
        model: 'stale',
        reasoningEffort: 'high',
        header: { provider: 'zai-coding-cn', model: 'glm-5.3', reasoningEffort: 'max' },
      }),
      transport: inProcess,
      args: { provider: 'zai-coding-cn' },
      configAgentOptions: { maxTokens: 128 },
      llm: catalog(),
      signal,
    })).resolves.toEqual({
      maxTokens: 128,
      provider: 'zai-coding-cn',
      model: 'glm-5.3',
      reasoningEffort: ReasoningEffortId('max'),
    })
  })

  it('requires model when selecting a different provider', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'zai-coding-cn', model: 'glm-5.3' }),
      transport: inProcess,
      args: { provider: 'kimi-coding' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).rejects.toThrow(/model is required when selecting a different provider/)
  })

  it('rejects an explicit model that is not in the provider catalog', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'zai-coding-cn', model: 'glm-5.3' }),
      transport: inProcess,
      args: { provider: 'kimi-coding', model: 'missing' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).rejects.toThrow(/is not in the "kimi-coding" catalog/)
  })

  it('does not require catalog membership for an inherited unlisted model', async () => {
    const llm = fakeLlm(
      new CatalogAdapter(
        { 'zai-coding-cn': [zaiFlash] },
        {
          'zai-coding-cn/unlisted': {
            provider: 'zai-coding-cn',
            id: 'unlisted',
            name: 'Unlisted',
            reasoning: { efforts: [{ id: ReasoningEffortId('max'), name: 'Max' }] },
          },
        },
      ),
      ['zai-coding-cn'],
    )
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'zai-coding-cn', model: 'unlisted', reasoningEffort: 'max' }),
      transport: inProcess,
      args: { reasoning_effort: 'max' },
      configAgentOptions: undefined,
      llm,
      signal,
    })).resolves.toEqual({
      provider: 'zai-coding-cn',
      model: 'unlisted',
      reasoningEffort: ReasoningEffortId('max'),
    })
  })

  it('drops inherited effort when the call changes model unless the call names one', async () => {
    const parent = parentOn({
      provider: 'zai-coding-cn',
      model: 'glm-5.3',
      reasoningEffort: 'max',
    })
    await expect(resolveDelegationAgentOptions({
      parent,
      transport: inProcess,
      args: { provider: 'kimi-coding', model: 'kimi-k2' },
      configAgentOptions: { maxTokens: 64, reasoningEffort: ReasoningEffortId('max') },
      llm: catalog(),
      signal,
    })).resolves.toEqual({
      maxTokens: 64,
      provider: 'kimi-coding',
      model: 'kimi-k2',
    })
    await expect(resolveDelegationAgentOptions({
      parent,
      transport: inProcess,
      args: { provider: 'kimi-coding', model: 'kimi-k2', reasoning_effort: 'high' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).resolves.toEqual({
      provider: 'kimi-coding',
      model: 'kimi-k2',
      reasoningEffort: ReasoningEffortId('high'),
    })
  })

  it('rejects an unsupported reasoning effort without clamping', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({ provider: 'kimi-coding', model: 'kimi-k2' }),
      transport: inProcess,
      args: { reasoning_effort: 'max' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).rejects.toThrow(/does not support reasoning effort "max"/)
  })

  it('rejects a parent with no route when the call names only effort', async () => {
    await expect(resolveDelegationAgentOptions({
      parent: parentOn({}),
      transport: inProcess,
      args: { reasoning_effort: 'max' },
      configAgentOptions: undefined,
      llm: catalog(),
      signal,
    })).rejects.toThrow(/parent has no LLM route/)
  })
})
