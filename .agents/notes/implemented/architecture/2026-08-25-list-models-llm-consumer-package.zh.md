# Agent Note: `list_models` 是一个 LLM Consumer 包

Status: implemented

[English](2026-08-25-list-models-llm-consumer-package.md) | 中文

## Problem

`list_models` 作为 `@deepseek-ai/dsh-tool-subagent-control` 的可单独加载子路径存在，尽管它只注入 `tools` 与 `llm`，从不注入 `subagents`。这种放置使实时的提供方／模型目录看起来像延续控制问题，迫使控制包的描述与目录归属提及一个 LLM Consumer，并阻止在不挂载 subagent 控制包图的情况下挂载该目录。

## Decision

`list_models` 现为 `packages/llm/tool-list-models` 下的 `@deepseek-ai/dsh-tool-list-models`。它是 LLM seam 的 Consumer：与之前相同的模型可见工具名、描述、参数、输出 schema、渲染文本、空白 provider 省略与执行行为。组合在 subagent 控制插件旁加载 `@deepseek-ai/dsh-tool-list-models`。`@deepseek-ai/dsh-tool-subagent-control` 只拥有 `send_message`、`interrupt_agent` 与 `list_agents`。

这是把 LLM 目录发现归还给 `llm/` 家族的第一个归属切片。后续切片可以同样移动其他面向 LLM 的 Consumer；本变更不要求它们。

## Alternatives considered

**继续把 `list_models` 留在 `dsh-tool-subagent-control/list-models`。** 未采纳：该工具从不触碰 `ctx.subagents`，因此由 subagent-control 拥有会误述 Consumer，并把可选的目录挂载耦合到延续控制。

**把它移到 `packages/subagent/` 下作为兄弟包。** 未采纳：它唯一的能力依赖是 `ctx.llm`；`llm/` 组已经拥有该 seam 的适配器与计量 Consumer。

**在抽取时改动模型可见的工具约定。** 未采纳：抽取只改归属；schema、描述与结果文本对 snapshot 与模型行为保持字节稳定。

## Consequences

获得：目录工具可以在没有 subagent 控制的情况下挂载；包、目录与组合归属与 LLM seam 一致；`dsh-tool-subagent-control` 回到延续工具。

代价：多一个包和组合行；所有命名旧子路径的 preset、fork-base patch、example 与生成器都必须改为 `@deepseek-ai/dsh-tool-list-models`。

## Testing

`packages/llm/tool-list-models/tests/list-models.spec.ts` 拥有工具行为。`packages/core/tools/tests/gen-tool-catalog.spec.ts` 固定目录包归属。`packages/bundle/fork-base`、`examples/acp-agent` 与随附 agent preset 中的组合行加载新包名。
