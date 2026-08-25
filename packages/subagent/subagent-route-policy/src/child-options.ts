/**
 * Active logged-route inheritance, agentDefaultModel fallback, and
 * route-change reasoning-effort policy for in-process children.
 * @module @deepseek-ai/dsh-subagent-route-policy/child-options
 */

import type { Agent, AgentOptions } from '@deepseek-ai/dsh-agent'

/**
 * Minimal shape of the `agentDefaultModel` service's `currentSelection()` return.
 * Declared locally to avoid a peerDependency on `@deepseek-ai/dsh-agent-default-model`:
 * the service is read opportunistically via `ctx.get()` and may be absent.
 */
interface DefaultModelSelection {
  provider: string
  model: string
}

/**
 * Resolve child `AgentOptions` with the parent's ACTIVE session route — its
 * latest logged request header — winning over create-time options. Host entry
 * points seed those options from the deployment default and leave a per-session
 * UI pick in the log only. Only when the parent has neither a logged route nor
 * an option does the live `agentDefaultModel` selection apply. Reasoning effort
 * follows the active route when the child stays on that route; a provider/model
 * override drops the inherited effort so the new model keeps its own default
 * unless the request names one.
 * @param parent - the delegating parent whose route the child inherits.
 * @param requested - per-child overrides, if any.
 * @param childDepth - the resolved delegation depth to stamp.
 * @returns the resolved options for `ctx.agents.create()`.
 */
export function resolveActiveChildAgentOptions(
  parent: Agent,
  requested: AgentOptions | undefined,
  childDepth: number,
): AgentOptions {
  const parentProvider = parent.options.provider
  const parentModel = parent.options.model
  const parentMaxTokens = parent.options.maxTokens
  const parentEffort = parent.options.reasoningEffort
  const headerConfig = parent.session.requestHeader()?.config
  const activeProvider = headerConfig?.provider ?? parentProvider
  const activeModel = headerConfig?.model ?? parentModel
  const activeEffort = headerConfig?.reasoningEffort ?? parentEffort
  const defaultSelection = activeModel === undefined
    ? (parent.ctx.get('agentDefaultModel') as { currentSelection(): DefaultModelSelection } | undefined)?.currentSelection()
    : undefined
  const override = requested ?? {}
  const routeChanged = (override.provider !== undefined && override.provider !== activeProvider)
    || (override.model !== undefined && override.model !== activeModel)
  const {
    provider: _requestedProvider,
    model: _requestedModel,
    maxTokens: requestedMaxTokens,
    reasoningEffort: requestedEffort,
    ...requestedRest
  } = override
  const provider = override.provider ?? activeProvider ?? defaultSelection?.provider
  const model = override.model ?? activeModel ?? defaultSelection?.model
  const effort = requestedEffort !== undefined
    ? requestedEffort
    : routeChanged
      ? undefined
      : activeEffort
  return {
    ...provider !== undefined ? { provider } : {},
    ...model !== undefined ? { model } : {},
    ...parentMaxTokens !== undefined ? { maxTokens: parentMaxTokens } : {},
    ...requestedMaxTokens !== undefined ? { maxTokens: requestedMaxTokens } : {},
    ...effort !== undefined ? { reasoningEffort: effort } : {},
    ...requestedRest,
    subagentDepth: childDepth,
  }
}
