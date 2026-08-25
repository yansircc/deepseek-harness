# Agent Note: Pluginize subagent route policy

Status: implemented

English | [中文](2026-08-25-pluginize-subagent-route-policy.zh.md)

## Problem

Logged active-route inheritance, `agentDefaultModel` fallback, route-change reasoning-effort dropping, and per-call provider/model/effort validation lived inside upstream-shared `dsh-subagent` and `dsh-tool-subagent` implementation files. Those policies are fork product behavior; keeping them in the shared Service Definition and base Consumer forced every upstream merge to re-litigate route ownership and blocked mounting plain create-time inheritance without the fork rules.

## Decision

`dsh-subagent` owns the smallest general resolver seam: `baselineChildAgentOptions` is create-time parent options plus request overrides, and `resolveChildAgentOptions` runs the `subagent/resolve-child-options` waterfall with that baseline as `next()`. Optional `SubagentRoute` types describe per-call schema and validation without requiring a provider.

`@deepseek-ai/dsh-subagent-route-policy` is the fork plugin. It short-circuits the waterfall with active logged-route inheritance, default-model fallback, and effort-on-route-change policy, and provides `ctx.subagentRoute` for model-facing Consumers. `dsh-tool-subagent` reads that service opportunistically: absent means no route fields and config `agentOptions` pass through; present means in-process transports gain the route parameters and catalog validation. Compositions mount the policy beside `dsh-subagent`.

An independent routed delegation Consumer was not required: route schema text and validation already move into the policy package, and the existing Consumer stays the single model-facing registration point with a thin optional service hook.

## Alternatives considered

**Keep route policy inside `resolveChildAgentOptions` and `tool-subagent/route.ts`.** Rejected: it embeds fork product rules in upstream-shared files and makes create-time-only inheritance unavailable without forking those modules on every merge.

**Replace `dsh-tool-subagent` with a separate routed Consumer package.** Rejected for this cut: it would duplicate the full tool registration surface to move schema text that the optional `ctx.subagentRoute` service already owns. Revisit only if a deployment must load a routed Consumer without the base package.

**Mutate `Agent.options` when the UI picks a model.** Still rejected; see [child inherits logged request route](../bug-fix/2026-08-19-child-inherits-logged-request-route.md).

## Consequences

Bought: upstream-shared child resolution stays create-time inheritance; fork route policy is one loadable plugin; model-visible schemas stay byte-stable when the policy is mounted; plain compositions can omit the plugin.

Cost: one more composition row; catalog and tool tests that expect route fields must mount the policy; `ctx.get('subagentRoute')` is the Consumer hook.

## Testing

`packages/subagent/subagent-route-policy/tests/child-options.spec.ts` and `delegation-route.spec.ts` own the fork policies. `subagent-in-process-driver.spec.ts` pins baseline create-time inheritance without a listener. `tool-subagent.spec.ts` mounts the policy for schema and execute coverage. Shipped base and ACP compositions load `@deepseek-ai/dsh-subagent-route-policy`.
