/**
 * Per-call LLM route selection for in-process subagent delegation.
 * @module @deepseek-ai/dsh-tool-subagent/route
 */

import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId, type LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import type { SubagentProvider } from '@deepseek-ai/dsh-subagent'

/** Catalog queries used to validate an explicit child LLM route. */
export interface DelegationLlmCatalog {
  listProviders(): ReadonlyArray<{ id: string }>
  listModels(provider: string): Promise<ReadonlyArray<{ id: string }>>
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>
}

/** Model-facing LLM route arguments on one delegation call. */
export interface DelegationRouteArgs {
  readonly provider?: string
  readonly model?: string
  readonly reasoning_effort?: string
}

/** Inputs for resolving the child `agentOptions` of one start. */
export interface ResolveDelegationRouteInput {
  readonly parent: Agent
  readonly transport: SubagentProvider
  readonly args: DelegationRouteArgs
  readonly configAgentOptions: AgentOptions | undefined
  readonly llm: DelegationLlmCatalog | undefined
  readonly signal: AbortSignal
}

/**
 * Whether this transport composes a local child that honors `AgentOptions`.
 * @param provider - the selected subagent transport.
 * @returns true when the child can apply provider, model, and effort.
 */
export function honorsLlmRoute(provider: SubagentProvider): boolean {
  return provider.capabilities.persona && provider.capabilities.toolFilter
}

/** Treat an omitted, empty, or whitespace tool string as absent. */
function omitBlankOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** Drop blank route fields and trim surviving ids. */
function normalizeDelegationRouteArgs(args: DelegationRouteArgs): DelegationRouteArgs {
  const provider = omitBlankOptionalString(args.provider)
  const model = omitBlankOptionalString(args.model)
  const reasoning_effort = omitBlankOptionalString(args.reasoning_effort)
  return {
    ...provider === undefined ? {} : { provider },
    ...model === undefined ? {} : { model },
    ...reasoning_effort === undefined ? {} : { reasoning_effort },
  }
}

/**
 * Whether the model named any LLM-route override.
 * @param args - the model-facing route fields on one delegation call.
 * @returns true when a non-blank provider, model, or reasoning_effort is present.
 */
export function hasDelegationRouteArgs(args: DelegationRouteArgs): boolean {
  const normalized = normalizeDelegationRouteArgs(args)
  return normalized.provider !== undefined
    || normalized.model !== undefined
    || normalized.reasoning_effort !== undefined
}

/** Read the parent session's active LLM route. */
function parentActiveRoute(parent: Agent): {
  provider: string | undefined
  model: string | undefined
  reasoningEffort: ReasoningEffortId | undefined
} {
  const header = parent.session.requestHeader()?.config
  return {
    provider: header?.provider ?? parent.options.provider,
    model: header?.model ?? parent.options.model,
    reasoningEffort: header?.reasoningEffort ?? parent.options.reasoningEffort,
  }
}

/**
 * Resolve child `agentOptions` from tool config plus optional model-facing
 * provider/model/effort. Omitted, empty, or whitespace call fields inherit
 * the parent's active route. A changed provider/model drops inherited effort
 * so the new model keeps its adapter default unless the call names one.
 * @param input - parent agent, transport, call args, config, and catalog.
 * @returns the child options, or the config options when the call names none.
 */
export async function resolveDelegationAgentOptions(
  input: ResolveDelegationRouteInput,
): Promise<AgentOptions | undefined> {
  const args = normalizeDelegationRouteArgs(input.args)
  const { configAgentOptions, transport } = input
  if (!hasDelegationRouteArgs(args)) return configAgentOptions
  if (!honorsLlmRoute(transport)) {
    throw new Error(
      'this subagent transport does not honor provider, model, or reasoning_effort — use an in-process subagent or omit those arguments',
    )
  }
  const llm = input.llm
  if (llm === undefined) {
    throw new Error('LLM catalog is unavailable')
  }

  const parentRoute = parentActiveRoute(input.parent)
  if (args.provider !== undefined && args.model === undefined && args.provider !== parentRoute.provider) {
    throw new Error('model is required when selecting a different provider; call list_models first')
  }
  const provider = args.provider ?? parentRoute.provider
  const model = args.model ?? parentRoute.model
  if (provider === undefined || model === undefined) {
    throw new Error('parent has no LLM route; pass provider and model from list_models')
  }

  if (args.provider !== undefined && !llm.listProviders().some(entry => entry.id === args.provider)) {
    throw new Error(`unknown provider "${args.provider}"; call list_models`)
  }
  // Explicit model selection is gated by the live catalog. Inherited or
  // effort-only routes are not: a parent may already be on an unlisted model.
  if (args.model !== undefined) {
    if (!llm.listProviders().some(entry => entry.id === provider)) {
      throw new Error(`unknown provider "${provider}"; call list_models`)
    }
    const catalog = await llm.listModels(provider)
    if (catalog.length === 0) {
      throw new Error(`provider "${provider}" has no catalog models; call list_models`)
    }
    if (!catalog.some(entry => entry.id === args.model)) {
      throw new Error(`model "${args.model}" is not in the "${provider}" catalog; call list_models`)
    }
  }

  const routeChanged = provider !== parentRoute.provider || model !== parentRoute.model
  const effort = args.reasoning_effort !== undefined
    ? ReasoningEffortId(args.reasoning_effort)
    : routeChanged
      ? undefined
      : parentRoute.reasoningEffort
  if (effort !== undefined) {
    const info = await llm.resolveModelInfo(provider, model, input.signal)
    const allowed = info.reasoning?.efforts ?? []
    if (!allowed.some(entry => entry.id === effort)) {
      throw new Error(
        info.reasoning === undefined
          ? `model "${model}" does not support reasoning effort`
          : `model "${model}" does not support reasoning effort "${effort}"; call list_models with that provider`,
      )
    }
  }

  const { reasoningEffort: _configEffort, ...configRest } = configAgentOptions ?? {}
  return {
    ...configRest,
    provider,
    model,
    ...effort !== undefined ? { reasoningEffort: effort } : {},
  }
}
