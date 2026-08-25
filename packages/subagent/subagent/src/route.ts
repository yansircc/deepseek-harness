/**
 * Optional per-call LLM route selection for model-facing delegation Consumers.
 * Deployments that expose provider/model/effort on `subagent` tools mount a
 * provider of `ctx.subagentRoute`; without it those Consumers stay route-free.
 * @module @deepseek-ai/dsh-subagent/route
 */

import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'
import type { LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import type { SubagentProvider } from './types.ts'

/** Catalog queries used to validate an explicit child LLM route. */
export interface DelegationLlmCatalog {
  /** Registered provider route ids. */
  listProviders(): ReadonlyArray<{ id: string }>
  /**
   * Models advertised for one provider.
   * @param provider - the provider route id.
   */
  listModels(provider: string): Promise<ReadonlyArray<{ id: string }>>
  /**
   * Exact model metadata including supported reasoning efforts.
   * @param provider - the provider route id.
   * @param model - the model id on that provider.
   * @param signal - cancels the metadata lookup.
   */
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>
}

/** Model-facing LLM route arguments on one delegation call. */
export interface DelegationRouteArgs {
  /** Optional provider route id. */
  readonly provider?: string
  /** Optional model id on the selected or inherited provider. */
  readonly model?: string
  /** Optional reasoning effort id. */
  readonly reasoning_effort?: string
}

/** Inputs for resolving the child `agentOptions` of one routed start. */
export interface ResolveDelegationRouteInput {
  /** The delegating parent agent. */
  readonly parent: Agent
  /** The selected subagent transport. */
  readonly transport: SubagentProvider
  /** Model-facing route fields from the tool call. */
  readonly args: DelegationRouteArgs
  /** Config-time child options from the tool instance. */
  readonly configAgentOptions: AgentOptions | undefined
  /** Live LLM catalog, when composed. */
  readonly llm: DelegationLlmCatalog | undefined
  /** Cancels catalog lookups during resolution. */
  readonly signal: AbortSignal
}

/** One model-facing string parameter on a routed delegation tool. */
export interface SubagentRouteParameter {
  /** JSON Schema type. */
  readonly type: 'string'
  /** Caller-facing description. */
  readonly description: string
}

/** Model-facing route parameter schemas contributed by `ctx.subagentRoute`. */
export interface SubagentRouteParameters {
  /** Optional provider route id. */
  readonly provider: SubagentRouteParameter
  /** Optional model id. */
  readonly model: SubagentRouteParameter
  /** Optional reasoning effort id. */
  readonly reasoning_effort: SubagentRouteParameter
}

/**
 * Optional service that owns per-call LLM route schemas and validation for
 * in-process delegation Consumers. Absent means those Consumers expose no
 * route fields and pass config `agentOptions` through unchanged.
 */
export interface SubagentRoute {
  /**
   * Whether this transport composes a local child that honors `AgentOptions`.
   * @param provider - the selected subagent transport.
   * @returns true when the child can apply provider, model, and effort.
   */
  honors(provider: SubagentProvider): boolean
  /**
   * Suffix appended to the tool description when {@link honors} is true.
   * @returns the description fragment, including a leading space when non-empty.
   */
  descriptionSuffix(): string
  /**
   * Model-facing `provider` / `model` / `reasoning_effort` parameter schemas.
   * @returns the three optional route parameters.
   */
  parameters(): SubagentRouteParameters
  /**
   * Resolve child `agentOptions` from tool config plus optional model-facing
   * route fields. Omitted blank call fields inherit the parent's active route.
   * @param input - parent, transport, call args, config, and catalog.
   * @returns the child options, or the config options when the call names none.
   */
  resolve(input: ResolveDelegationRouteInput): Promise<AgentOptions | undefined>
}
