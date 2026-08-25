/**
 * Fork route policy for subagent children: logged active-route inheritance,
 * agentDefaultModel fallback, route-change effort dropping, and the optional
 * `ctx.subagentRoute` service that model-facing delegation Consumers use for
 * per-call provider/model/effort schemas and catalog validation.
 * @module @deepseek-ai/dsh-subagent-route-policy
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { AgentOptions } from '@deepseek-ai/dsh-agent'
import type {
  ResolveChildAgentOptionsInput,
  ResolveDelegationRouteInput,
  SubagentRoute,
  SubagentRouteParameters,
  SubagentProvider,
} from '@deepseek-ai/dsh-subagent'
import { resolveActiveChildAgentOptions } from './child-options.ts'
import {
  delegationRouteDescriptionSuffix,
  delegationRouteParameters,
  honorsLlmRoute,
  resolveDelegationAgentOptions,
} from './delegation-route.ts'

export {
  hasDelegationRouteArgs,
  honorsLlmRoute,
  resolveDelegationAgentOptions,
} from './delegation-route.ts'
export { resolveActiveChildAgentOptions } from './child-options.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Per-call LLM route schemas and validation for in-process delegation tools. */
    subagentRoute: SubagentRoutePolicy
  }
}

/** Cordis plugin name. */
export const name = 'subagent-route-policy'

/**
 * Provides `ctx.subagentRoute` and owns the `subagent/resolve-child-options`
 * waterfall for active logged-route inheritance.
 */
export class SubagentRoutePolicy extends Service implements SubagentRoute {
  constructor(ctx: Context) {
    super(ctx, 'subagentRoute')
    ctx.on('subagent/resolve-child-options', (
      input: ResolveChildAgentOptionsInput,
      _next: () => AgentOptions,
    ) => resolveActiveChildAgentOptions(input.parent, input.requested, input.childDepth))
  }

  /**
   * Whether this transport composes a local child that honors `AgentOptions`.
   * @param provider - the selected subagent transport.
   * @returns true when the child can apply provider, model, and effort.
   */
  honors(provider: SubagentProvider): boolean {
    return honorsLlmRoute(provider)
  }

  /**
   * Suffix appended to the tool description when {@link honors} is true.
   * @returns the description fragment, including a leading space.
   */
  descriptionSuffix(): string {
    return delegationRouteDescriptionSuffix()
  }

  /**
   * Model-facing `provider` / `model` / `reasoning_effort` parameter schemas.
   * @returns the three optional route parameters.
   */
  parameters(): SubagentRouteParameters {
    return delegationRouteParameters()
  }

  /**
   * Resolve child `agentOptions` from tool config plus optional model-facing
   * route fields.
   * @param input - parent, transport, call args, config, and catalog.
   * @returns the child options, or the config options when the call names none.
   */
  resolve(input: ResolveDelegationRouteInput): Promise<AgentOptions | undefined> {
    return resolveDelegationAgentOptions(input)
  }
}

export default SubagentRoutePolicy
