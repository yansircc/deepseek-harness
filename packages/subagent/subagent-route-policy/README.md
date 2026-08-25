# @deepseek-ai/dsh-subagent-route-policy

English | [中文](README.zh.md)

Owns fork LLM route policy for in-process subagent children: logged active-route inheritance, `agentDefaultModel` fallback, route-change reasoning-effort dropping, and the optional `ctx.subagentRoute` service that model-facing delegation Consumers use for per-call `provider` / `model` / `reasoning_effort` schemas and catalog validation.

## Role

Without this plugin, `resolveChildAgentOptions` keeps create-time parent options plus request overrides, and `dsh-tool-subagent` exposes no route fields. With it mounted beside `dsh-subagent`, every in-process child creation runs the active-route waterfall, and each `dsh-tool-subagent` instance that binds an in-process transport gains the route parameters and validation.

Product transports still omit those fields: `ctx.subagentRoute.honors` is false when the provider lacks `persona` and `toolFilter`.

## Composition

Load after `@deepseek-ai/dsh-subagent` and before the in-process providers and `dsh-tool-subagent` rows. The shipped base bundle and ACP example include this row.

## Testing

`tests/child-options.spec.ts` pins logged-route preference, effort inheritance and drop, and default-model fallback. `tests/delegation-route.spec.ts` pins blank-as-omit, catalog validation, and product-transport rejection.

## Model Experience

### Parent delegation schema fields

#### What the model sees

When this plugin is mounted and the bound transport honors LLM routes, each `dsh-tool-subagent` instance gains the optional `provider`, `model`, and `reasoning_effort` fields documented on the generated [`subagent` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-subagent), plus the description suffix that points at `list_models`. Product transports omit those fields.

#### Token effect

Fixed schema cost only while the plugin is mounted and the transport honors routes; omitting the plugin removes the three parameters and the description suffix.

#### KV Cache effect

Prefix-stable for a given composition; mounting or removing the plugin, or switching between an in-process and product transport, changes the parent tool definition.

### Child-agent request route

#### What the model sees

In-process children created through `resolveChildAgentOptions` inherit the parent's latest logged `request/header` provider/model, and inherit effort when the route is unchanged. Create-time options apply only when no header exists; `agentDefaultModel` is last resort. Per-call overrides from the parent tool still win.

#### Token effect

No parent-schema tokens; the child's request pays for whichever provider/model the policy selected.

#### KV Cache effect

Independent of the parent request cache. A different inherited or overridden provider/model establishes a different child prefix.

## Known Limitations and Deferred Work

- **Absent plugin means create-time inheritance only** — compositions that omit this row do not inherit logged UI model picks and expose no per-call route fields on `dsh-tool-subagent`.
- **Product transports never honor route fields** — providers without `persona` and `toolFilter` keep the schema closed; explicit route args are rejected at execute time.
