# Agent Note: Stats line UI is an independent client plugin

Status: implemented

[English](2026-08-25-ui-stats-client-plugin.md) | 中文

## Problem

编辑器统计行、其五个通用设置开关，以及承载它们的 `ui-conversation` 设置字段，原先和繁忙态 Enter 一起住在 `@deepseek-ai/dsh-client-ui-conversation` 里。这让 fork 自有的投影组合（`sessionStats` + `sessionToolStats` + `tokenUsage`）看起来像上游会话 chrome，迫使每个只要会话的装配也拥有统计条，并在合并上游会话改动时反复重议本地统计条。

## Decision

`packages/client/ui-stats` 下的 `@deepseek-ai/dsh-client-ui-stats` 拥有 `StatsLine`、`StatsDisplayRow`、五个展示开关、locale 文案、CSS 以及 Host schema 注册。它通过 `ctx.slots.inject` 贡献到 `conversation.composer.dock` 与 `settings.general.item`。

`ui-conversation` 将 `conversation.composer.dock` 声明为**单例**会话作用域座位并保持空置：一个注册者拥有该环境信息带，同一优先级的第二次注册会立刻失败，未占用则不渲染。这是可选环境读出的最小通用扩展点；发货占用者是统计插件。展示行为与先前统计条一致：五个布尔默认开，全关隐藏整行，没有数据的分组在开关打开时仍会隐藏，缓存命中小数展示仍在呈现层（[高命中小数](../feature/2026-08-19-high-cache-hit-decimal-display.zh.md)）。

持久偏好使用 `ui-stats` 设置命名空间，字段名不变。`ui-conversation` 只保留 `busyEnter`。上下文占用仍在 ui-conversation 的 `ContextMeter`，并用本地的 `formatTokens` / `contextOccupancy` 辅助函数。发货的 web-app bundle 在 `ui-conversation` 旁加载该新行。

交叉引用：开关与投影组合的产品行为仍记录在[会话展示开关](../feature/2026-08-20-conversation-display-toggles.zh.md)与 [sessionToolStats](2026-08-25-session-tool-stats-projection.zh.md)。

## Alternatives considered

**把 StatsLine 留在 `ui-conversation`。** 否决：统计条的 fork 本地工具次数组合与展示开关不是会话域 chrome，且从其他插件直接导入组件会绕过 slot 生命周期。

**把五个开关留在 `ui-conversation` 设置命名空间。** 否决：从 `ConversationSettings` 去掉统计字段就是所有权切割；预发布允许新命名空间而不做迁移垫片。

**让 `conversation.composer.dock` 继续保持 list。** 本次切割否决：list 会允许统计行旁再有第二条环境读出；单例座位是「一个插件拥有该带、不出现重复条目」的最小保证。

**把 ContextMeter 一并搬进统计包。** 否决：占用率已有独立归属（编辑器工具行），在去掉统计插件时仍须保留。

## Consequences

换来：可在不拥有会话设置的情况下可选挂载统计条；`ui-conversation` 不再注册 dock 占用者或 stats-display 行；包与 slot catalog 所有权与 fork 特性一致。

代价：多一个客户端插件与 bundle 行；先前写在 `ui-conversation` 下的统计开关在改到 `ui-stats` 前会被忽略。

## Testing

`packages/client/ui-stats/tests/` 覆盖 schema 默认值、display-policy 的采纳／写入、StatsDisplayRow、StatsLine 的派生／开关／组合（含 `sessionToolStats`），以及两个 slot 的 apply 接线。`ui-conversation` 的 apply 规格断言统计注册不存在且 dock 座位保持声明为空。`pnpm run test:gui` 覆盖该 GUI 包对。
