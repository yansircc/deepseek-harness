# Agent Note: 独立的 sessionToolStats 投影承载已配对工具调用次数

Status: implemented

[English](2026-08-25-session-tool-stats-projection.md) | 中文

## Problem

本地分支曾把全会话已配对工具调用次数（`toolCalls`）写进 `@deepseek-ai/dsh-session-stats`，并把该单元升到 `stateVersion` 2。上游 `sessionStats` 只拥有轮／步计数与墙钟时间。把仅本地 UI 需要的次数字段留在上游包里会阻碍干净合并，并把分叉专属数字绑死在共享投影键上。

## Decision

`@deepseek-ai/dsh-session-tool-stats` 注册独立的 `sessionToolStats` 投影单元，视图为 `{ toolCalls }`。配对规则与 `sessionStats.toolMs` 及窗口折叠一致：按 callId 统计 `tool/call` → `tool/result`；在 `turn/end` 丢弃未解决调用；忽略孤儿 result。`stateVersion` 为 1。上游 `@deepseek-ai/dsh-session-stats` 在该字段上与 upstream/master 字节一致（无 `toolCalls`，`stateVersion` 为 1）。

web-app bundle 同时挂载两个插件。`StatsLine` 组合 `useProjection('sessionStats')` 与 `useProjection('sessionToolStats')` 画出 `工具 {count}次 {duration}` 分组。没有 `sessionStats` 的装配仍整体回退到 `deriveStats`（含其窗口 `toolCalls`）。有 `sessionStats` 而无 `sessionToolStats` 时，次数为 0，时长仍来自 `toolMs`。

## Alternatives considered

**继续把 `toolCalls` 留在 `sessionStats` 上并永久偏离上游。** 否决，因为每次上游同步都会重开该字段与 `stateVersion` 争议。

**把 `toolMs` 一并迁入新包。** 本切片否决：时长已由上游 `sessionStats` 提供；只需抽出本地次数。

**在已有 `sessionStats` 时由客户端从已加载节点推导次数。** 否决，因为分页与压缩会再次把数字限定到窗口；持久投影与其他全会话数字同一架构。

## Consequences

分叉本地的工具次数 UI 不再改动上游 session-stats。`sessionStats` 投影缓存保持上游 `stateVersion` 1；`sessionToolStats` 使用自己的缓存键。同时需要时长与次数的消费者必须组合两个单元（web-app 已如此）。另见[会话显示开关](../feature/2026-08-20-conversation-display-toggles.zh.md)。

## Testing

包测试覆盖空日志零值、已配对计数与变更流 seq、延迟挂载、HMR 卸载、Loader 组合，以及孤儿／剪枝／`constructor` callId 折叠。客户端测试覆盖 StatsLine 对 `sessionStats` + `sessionToolStats` 的 Tools 分组组合。connection fixture 提供两个键，并在 `tool/result` 时推进 `sessionToolStats`。
