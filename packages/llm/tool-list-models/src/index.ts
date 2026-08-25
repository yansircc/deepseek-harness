/**
 * The globally named `list_models` tool: a thin model-facing Consumer over
 * `ctx.llm.listProviders()`, `listModels()`, and `resolveModelInfo()`. It is
 * independently loadable so a deployment can expose the live LLM catalog
 * without mounting subagent continuation controls.
 * @module @deepseek-ai/dsh-tool-list-models
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { LlmProviderInfo, LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'

export const name = 'tool-list-models'
export const inject = ['tools', 'llm']

interface ListModelsRequest {
  readonly provider?: string
}

interface CatalogProvider {
  readonly id: string
  readonly name: string
  readonly models: string[]
}

interface CatalogModel {
  readonly id: string
  readonly name: string
  readonly contextWindow?: number
  readonly reasoning_efforts?: string[]
}

type ListModelsResult =
  | { providers: CatalogProvider[] }
  | { provider: Pick<LlmProviderInfo, 'id' | 'name'>; models: CatalogModel[] }

/** Treat an omitted, empty, or whitespace `provider` as the all-routes overview. */
function omitBlankOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Project exact-model metadata into the model-facing catalog row. */
function projectModel(info: LlmResolvedModelInfo): CatalogModel {
  const efforts = info.reasoning?.efforts.map(effort => effort.id) ?? []
  return {
    id: info.id,
    name: info.name,
    ...info.context === undefined ? {} : { contextWindow: info.context.contextWindow },
    ...efforts.length === 0 ? {} : { reasoning_efforts: efforts },
  }
}

/** Render the all-providers snapshot. */
function renderProviders(providers: readonly CatalogProvider[]): string {
  if (providers.length === 0) return '(no providers)'
  return providers
    .map(entry => (
      `${entry.id} (${entry.name}): ${entry.models.length === 0 ? '(no models)' : entry.models.join(', ')}`
    ))
    .join('\n')
}

/** Render one provider's detailed catalog. */
function renderProviderModels(
  provider: Pick<LlmProviderInfo, 'id' | 'name'>,
  models: readonly CatalogModel[],
): string {
  const header = `${provider.id} (${provider.name})`
  if (models.length === 0) return `${header}\n(no models)`
  return [
    header,
    ...models.map((model) => {
      const window = model.contextWindow === undefined ? '' : ` contextWindow=${String(model.contextWindow)}`
      const efforts = model.reasoning_efforts === undefined
        ? ''
        : ` reasoning_efforts=${model.reasoning_efforts.join(',')}`
      return `${model.id} (${model.name})${window}${efforts}`
    }),
  ].join('\n')
}

/**
 * Register the `list_models` tool.
 * @param ctx - context carrying the tool registry and LLM runtime.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'list_models',
    description:
      'List the live LLM provider routes and their catalog models. Call this before setting '
      + 'provider, model, or reasoning_effort on an in-process subagent or subagent_fork. '
      + 'Omit provider to list every registered route and its model ids. Pass provider to see '
      + 'that route\'s models, context windows, and supported reasoning efforts. This catalog '
      + 'does not include product subagent transports such as Cursor, Claude Code, or Codex.',
    parameters: {
      provider: {
        type: 'string',
        description:
          'One registered LLM provider route. Omit to list every route; set it to inspect that '
          + 'route\'s models and reasoning efforts.',
      },
    },
    output: {
      schema: {
        oneOf: [
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              providers: {
                type: 'array',
                required: true,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string', required: true },
                    name: { type: 'string', required: true },
                    models: { type: 'array', required: true, items: { type: 'string' } },
                  },
                },
              },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              provider: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                  id: { type: 'string', required: true },
                  name: { type: 'string', required: true },
                },
              },
              models: {
                type: 'array',
                required: true,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    id: { type: 'string', required: true },
                    name: { type: 'string', required: true },
                    contextWindow: { type: 'number' },
                    reasoning_efforts: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        ],
      },
      render: (_args, value: ListModelsResult) => [{
        type: 'text',
        text: 'providers' in value
          ? renderProviders(value.providers)
          : renderProviderModels(value.provider, value.models),
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args: ListModelsRequest, exec): Promise<ListModelsResult> {
      exec.signal.throwIfAborted()
      const requested = omitBlankOptionalString(args.provider)
      if (requested !== undefined) {
        const info = ctx.llm.listProviders().find(entry => entry.id === requested)
        if (info === undefined) {
          throw new Error(`unknown provider "${requested}"`)
        }
        const catalog = await ctx.llm.listModels(info.id)
        exec.signal.throwIfAborted()
        const models: CatalogModel[] = []
        for (const entry of catalog) {
          exec.signal.throwIfAborted()
          models.push(projectModel(await ctx.llm.resolveModelInfo(info.id, entry.id, exec.signal)))
        }
        return { provider: { id: info.id, name: info.name }, models }
      }

      const providers: CatalogProvider[] = []
      for (const entry of ctx.llm.listProviders()) {
        exec.signal.throwIfAborted()
        const catalog = await ctx.llm.listModels(entry.id)
        providers.push({
          id: entry.id,
          name: entry.name,
          models: catalog.map(model => model.id),
        })
      }
      return { providers }
    },
  }))
}
