# Agent Note: Blank optional LLM route fields are omitted

Status: implemented

[English](2026-08-24-subagent-blank-route-fields.md) | 中文

## Problem

`subagent`、`subagent_fork` 和 `list_models` 只要解析后的工具 JSON 带有键，就把可选的 `provider`、`model` 和 `reasoning_effort` 当作已提供。模型在 schema 要求省略字段时经常发送 `""`。空字符串于是变成路由 id：委派以 `unknown provider ""` 失败，`list_models` 则以 `provider must be a non-empty route id` 失败，而不是列出全部已注册路由。出错之后，模型常会猜测 `openai` 或 `deepseek` 这类品牌名；当实际 id 是自定义路由时，这些猜测仍然失败。

## Decision

每个可选路由字符串都会先去掉首尾空白。空值或仅空白的值按省略处理。在 `subagent` 和 `subagent_fork` 上，这会恢复「继承父级当前路由」。在 `list_models` 上，这会恢复「列出全部路由」。非空但未知的 id 仍然失败。保留下来的值使用去空白后的文本，因此 `"  ccc-gpt  "` 匹配 `ccc-gpt`。

该辅助函数留在各自的包内。`@deepseek-ai/dsh-tool-list-models` 不得导入 `@deepseek-ai/dsh-tool-subagent`。委派侧的空白即省略位于 `@deepseek-ai/dsh-subagent-route-policy`。面向模型的 schema 描述仍写「省略以继承」／「省略以列出全部路由」；空值按省略处理，是这些工具解释它们已经收到的 JSON 的方式。

## Alternatives considered

**继续拒绝空字符串。** 未采纳：schema 已经要求模型省略该字段，而模型把这种省略编码成 `""`。把 `""` 当作路由 id，会使继承和目录总览无法到达。

**改 schema 文案，写明空值也算省略。** 未采纳：这会重生成 `docs/tool-catalog` 和组装后的系统提示词 snapshot，却不改变模型对「省略」已经抱有的预期。

**在两个包之间共享同一个辅助函数。** 未采纳：函数只有四行，而且 list-models 导入委派包会把无关的 Consumer 耦合在一起。

**把空值或猜到的品牌名映射到默认路由。** 未采纳：已注册 id 是部署路由 id。非空但未知的 id 必须继续响亮失败。

## Consequences

发送空白路由字段的调用，与省略这些字段的调用走同一条路径。schema 文案、生成的目录和系统提示词 snapshot 保持不变。产品级传输仍然拒绝非空白的 `provider`、`model` 或 `reasoning_effort`；空白值不会触发该拒绝。

## Testing

`packages/subagent/subagent-route-policy/tests/delegation-route.spec.ts` 固定空白继承、产品传输上的空白字段，以及去空白后的显式 id。`packages/llm/tool-list-models/tests/list-models.spec.ts` 固定空白总览、去空白后的已知 id，以及对未知 id 的拒绝。
