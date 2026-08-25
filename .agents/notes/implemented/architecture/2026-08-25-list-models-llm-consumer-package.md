# Agent Note: `list_models` is an LLM Consumer package

Status: implemented

English | [中文](2026-08-25-list-models-llm-consumer-package.zh.md)

## Problem

`list_models` lived as a separately loadable subpath of `@deepseek-ai/dsh-tool-subagent-control` even though it injects only `tools` and `llm`, never `subagents`. That placement made the live provider/model catalog look like a continuation-control concern, forced the control package's description and catalog ownership to mention an LLM Consumer, and blocked mounting the catalog without the subagent control package graph.

## Decision

`list_models` is `@deepseek-ai/dsh-tool-list-models` under `packages/llm/tool-list-models`. It is a Consumer of the LLM seam: same model-visible tool name, description, parameters, output schema, render text, blank-provider omission, and execute behavior as before. Compositions load `@deepseek-ai/dsh-tool-list-models` beside the subagent control plugins. `@deepseek-ai/dsh-tool-subagent-control` owns only `send_message`, `interrupt_agent`, and `list_agents`.

This is the first ownership slice that returns LLM catalog discovery to the `llm/` family. Later slices may move other LLM-facing Consumers the same way; they are not required by this change.

## Alternatives considered

**Keep `list_models` as `dsh-tool-subagent-control/list-models`.** Rejected: the tool never touches `ctx.subagents`, so subagent-control ownership misstates the Consumer and couples optional catalog mounting to continuation controls.

**Move it under `packages/subagent/` as a sibling package.** Rejected: its only capability dependency is `ctx.llm`; the `llm/` group already owns that seam's adapters and measurement Consumers.

**Change the model-visible tool contract while extracting.** Rejected: the extraction is ownership only; schema, description, and result text stay byte-stable for snapshots and model behavior.

## Consequences

Bought: the catalog tool can mount without subagent control; package, catalog, and composition ownership match the LLM seam; `dsh-tool-subagent-control` returns to continuation tooling.

Cost: one more package and composition row; every preset, fork-base patch, example, and generator that named the old subpath must name `@deepseek-ai/dsh-tool-list-models`.

## Testing

`packages/llm/tool-list-models/tests/list-models.spec.ts` owns the tool behavior. `packages/core/tools/tests/gen-tool-catalog.spec.ts` pins catalog package ownership. Composition rows in `packages/bundle/fork-base`, `examples/acp-agent`, and the shipped agent presets load the new package name.
