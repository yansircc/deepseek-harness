import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, {
  CallId,
  LlmAdapter,
  ReasoningEffortId,
  type LlmModelInfo,
  type LlmProviderInfo,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as tool from '../src/index.ts'

class CatalogAdapter extends LlmAdapter {
  constructor(
    private readonly provider: LlmProviderInfo,
    private readonly models: readonly LlmModelInfo[],
    private readonly resolved: Readonly<Record<string, LlmResolvedModelInfo>> = {},
  ) {
    super()
  }

  override providerInfo(_provider: string): LlmProviderInfo {
    return this.provider
  }

  override listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve(this.models)
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve(this.resolved[model] ?? { provider, id: model, name: model })
  }

  async * stream(): AsyncIterable<StreamChunk> {
    throw new Error('CatalogAdapter does not stream')
  }
}

const testToolSignal = new AbortController().signal
let calls = 0

function callTool(ctx: Context, args: unknown, signal: AbortSignal = testToolSignal) {
  return ctx.tools.execute({
    signal,
    callId: CallId(`call-${++calls}`),
    name: 'list_models',
    arguments: args,
  })
}

function text(result: { content: { type: string; text?: string }[] }): string {
  return result.content.filter(block => block.type === 'text').map(block => block.text).join('')
}

async function setup() {
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(tool)
  ctx.llm.registerAdapter(['zai-coding-cn'], new CatalogAdapter(
    { id: 'zai-coding-cn', name: 'Z.ai Coding' },
    [{ provider: 'zai-coding-cn', id: 'glm-5.3', name: 'GLM 5.3' }],
    {
      'glm-5.3': {
        provider: 'zai-coding-cn',
        id: 'glm-5.3',
        name: 'GLM 5.3',
        context: { contextWindow: 200_000 },
        reasoning: {
          efforts: [
            { id: ReasoningEffortId('high'), name: 'High' },
            { id: ReasoningEffortId('max'), name: 'Max' },
          ],
        },
      },
    },
  ))
  ctx.llm.registerAdapter(['empty'], new CatalogAdapter(
    { id: 'empty', name: 'Empty' },
    [],
  ))
  return ctx
}

describe('dsh-tool-list-models', () => {
  it('registers list_models once, globally, with only the optional provider parameter', async () => {
    const ctx = await setup()
    const schemas = ctx.tools.schemas().filter(schema => schema.name === 'list_models')
    expect(schemas).toHaveLength(1)
    const parameters = schemas[0]!.parameters as {
      properties?: Record<string, unknown>
      required?: string[]
    }
    expect(Object.keys(parameters.properties ?? {})).toEqual(['provider'])
    expect(parameters.required ?? []).toEqual([])
    expect(schemas[0]!.description).toContain('subagent')
    expect(schemas[0]!.description).toContain('Cursor')
  })

  it('lists every registered route and its catalog model ids without a calling agent', async () => {
    const ctx = await setup()
    const result = await callTool(ctx, {})
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected list_models success')
    expect(result.value).toEqual({
      providers: [
        { id: 'zai-coding-cn', name: 'Z.ai Coding', models: ['glm-5.3'] },
        { id: 'empty', name: 'Empty', models: [] },
      ],
    })
    expect(text(result)).toBe(
      'zai-coding-cn (Z.ai Coding): glm-5.3\n'
      + 'empty (Empty): (no models)',
    )
  })

  it('returns context window and reasoning efforts for one provider', async () => {
    const ctx = await setup()
    const result = await callTool(ctx, { provider: 'zai-coding-cn' })
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected list_models success')
    expect(result.value).toEqual({
      provider: { id: 'zai-coding-cn', name: 'Z.ai Coding' },
      models: [{
        id: 'glm-5.3',
        name: 'GLM 5.3',
        contextWindow: 200_000,
        reasoning_efforts: ['high', 'max'],
      }],
    })
    expect(text(result)).toBe(
      'zai-coding-cn (Z.ai Coding)\n'
      + 'glm-5.3 (GLM 5.3) contextWindow=200000 reasoning_efforts=high,max',
    )
  })

  it('treats a blank provider as an overview of every route', async () => {
    const ctx = await setup()
    const overview = await callTool(ctx, {})
    expect(overview.isError).toBe(false)
    if (overview.isError) throw new Error('expected list_models success')
    for (const provider of ['', '   ', '\t']) {
      const result = await callTool(ctx, { provider })
      expect(result.isError).toBe(false)
      if (result.isError) throw new Error('expected list_models success')
      expect(result.value).toEqual(overview.value)
    }
  })

  it('trims a known provider id and rejects an unknown one', async () => {
    const ctx = await setup()
    const padded = await callTool(ctx, { provider: '  zai-coding-cn  ' })
    expect(padded.isError).toBe(false)
    if (padded.isError) throw new Error('expected list_models success')
    expect(padded.value).toEqual({
      provider: { id: 'zai-coding-cn', name: 'Z.ai Coding' },
      models: [{
        id: 'glm-5.3',
        name: 'GLM 5.3',
        contextWindow: 200_000,
        reasoning_efforts: ['high', 'max'],
      }],
    })
    const missing = await callTool(ctx, { provider: 'missing' })
    expect(missing.isError).toBe(true)
    expect(text(missing)).toContain('unknown provider "missing"')
  })

  it('renders an empty provider detail and models without optional metadata', async () => {
    const ctx = await setup()
    ctx.llm.registerAdapter(['plain'], new CatalogAdapter(
      { id: 'plain', name: 'Plain' },
      [{ provider: 'plain', id: 'plain-1', name: 'Plain 1' }],
      {
        'plain-1': { provider: 'plain', id: 'plain-1', name: 'Plain 1' },
      },
    ))
    const empty = await callTool(ctx, { provider: 'empty' })
    expect(empty.isError).toBe(false)
    if (empty.isError) throw new Error('expected list_models success')
    expect(empty.value).toEqual({
      provider: { id: 'empty', name: 'Empty' },
      models: [],
    })
    expect(text(empty)).toBe('empty (Empty)\n(no models)')

    const plain = await callTool(ctx, { provider: 'plain' })
    expect(plain.isError).toBe(false)
    if (plain.isError) throw new Error('expected list_models success')
    expect(plain.value).toEqual({
      provider: { id: 'plain', name: 'Plain' },
      models: [{ id: 'plain-1', name: 'Plain 1' }],
    })
    expect(text(plain)).toBe('plain (Plain)\nplain-1 (Plain 1)')
  })

  it('renders (no providers) when no adapters are registered', async () => {
    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(tool)
    const result = await callTool(ctx, {})
    expect(result.isError).toBe(false)
    if (result.isError) throw new Error('expected list_models success')
    expect(result.value).toEqual({ providers: [] })
    expect(text(result)).toBe('(no providers)')
  })

  it('declares concurrency safety', async () => {
    const ctx = await setup()
    expect(ctx.tools.get('list_models')?.isConcurrencySafe?.({})).toBe(true)
  })

  it('has the namespace-plugin export shape', () => {
    expect('default' in tool).toBe(false)
    expect(tool.name).toBe('tool-list-models')
    expect(tool.inject).toEqual(['tools', 'llm'])
    expect(typeof tool.apply).toBe('function')
  })
})
