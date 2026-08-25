# Agent Note: Child agents inherit the parent's logged request route

Status: implemented

English | [中文](2026-08-19-child-inherits-logged-request-route.zh.md)

## Problem

In-process children inherit a provider/model so they authenticate on the same route as the parent. Web create and resume seed `AgentOptions` from the live deployment default and record a later per-session pick only in `request/header`. Preferring those options over the log sent every child to a provider the parent was not using — typically the default whose key is missing or invalid — so the child failed immediately with `AUTH` while the parent kept running.

## Decision

`resolveChildAgentOptions()` dispatches `subagent/resolve-child-options`. With `@deepseek-ai/dsh-subagent-route-policy` mounted, the parent's latest logged `request/header` provider/model is the ACTIVE route and create-time options apply only when the parent has not yet logged a request. `agentDefaultModel` remains the last resort when both are absent. A per-child `request.agentOptions` override still wins. Without that plugin, the baseline keeps create-time parent options only.

See [pluginize subagent route policy](../architecture/2026-08-25-pluginize-subagent-route-policy.md).

## Alternatives considered

**Update `Agent.options` when the UI picks a model.** Rejected: options are the create/resume seed, and the loop already treats the logged header plus `agent/request` as the live route. Mutating options would add a second write of the same fact.

**Install the Web model-selection listener on every child.** Rejected: children do not go through the api-proxy create path, and a blank child with no log would still read the deployment default.

**Treat options as unset when they equal the current default.** Rejected: that compares two live values and still loses if the default moved after the parent was created, or if the parent was created on the route it still wants.

## Consequences

A Web parent that switched models after create delegates on the logged route, so the child uses the same credential as the parent. A parent that has never requested still hands its create-time options to the child. The inherit no longer treats a host-seeded option as an explicit user choice.

## Testing

`packages/subagent/subagent-route-policy/tests/child-options.spec.ts` asserts a parent whose options name a stale default and whose log names a different route produces a child on the logged route.
