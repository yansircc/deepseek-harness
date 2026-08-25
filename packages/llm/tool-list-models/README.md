# @deepseek-ai/dsh-tool-list-models

English | [中文](README.zh.md)

The globally named `list_models` tool is a thin Consumer over `ctx.llm`. It projects the live provider/model catalog so a parent can inspect registered routes before setting per-call `provider`, `model`, or `reasoning_effort` on an in-process delegation tool. The package does not depend on the subagent control tools; a deployment can mount this catalog without child messaging or discovery.

`list_models` takes an optional `provider`. With no argument it returns every registered LLM route and its catalog model ids. With `provider` it returns that route's models plus each model's `contextWindow` and `reasoning_efforts`. Empty or whitespace `provider` values are treated as omitted. It does not require a calling agent and does not list product subagent transports such as Cursor, Claude Code, or Codex.

## Model Experience

### Tool schema

#### What the model sees

The generated [`list_models` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-list-models): optional `provider` route id.

#### Token effect

Fixed schema cost per request where the tool is visible.

#### KV Cache effect

Prefix-stable; the schema does not change at runtime.

### Catalog result

#### What the model sees

One line per registered LLM route when `provider` is omitted: `<id> (<name>): <model ids>` or `(no models)`. One provider plus one line per model when `provider` is set: `<id> (<name>) contextWindow=<n> reasoning_efforts=<ids>`. `(no providers)` means no adapter is registered. Product subagent transports never appear. An unknown non-blank route id is an errored result naming the missing provider.

#### Token effect

Grows with the registered catalog — every route on the overview call, and every model on a provider call; there is no cursor.

#### KV Cache effect

Append-only; each result follows the reusable request prefix.

## Known Limitations and Deferred Work

- **The model catalog is a live adapter snapshot** — a route the parent is already using may be unlisted, and explicit `provider`/`model` selection on an in-process delegation still requires catalog membership.
- **Product subagent transports stay out of this catalog** — Cursor, Claude Code, and Codex are not LLM provider routes; listing them here would mix incompatible selection vocabularies.
