# @deepseek-ai/dsh-client-ui-stats

[English](README.md) | 中文

编辑器统计行及其通用设置展示开关。统计行占用单例 `conversation.composer.dock` 座位；偏好区块占用 `settings.general.item`（`stats-display`，order 30）。计数与墙钟时间由 `sessionStats` 与 `sessionToolStats.toolCalls`、`tokenUsage` 组合；没有 `sessionStats` 的装配回退到窗口折算。

```yaml
- id: ui-stats
  name: '@deepseek-ai/dsh-client-ui-stats'
```

`StatsSettings`（`$DSH_HOME/settings.yaml` 中的 `ui-stats`）携带五个布尔字段——`showStatsCounts`、`showStatsDurations`、`showStatsLatency`、`showStatsCacheHit`、`showStatsTokens`——默认全部为开。`StatsDisplayPolicy` 拥有实时记录。五个开关全关则隐藏统计行；没有数据的分组在开关打开时仍会隐藏。`@deepseek-ai/dsh-client-ui-conversation` 声明该单例 dock 座位并保持空置；去掉本插件则该带空白。先前写在 `ui-conversation` 下的统计开关在改到 `ui-stats` 前会被忽略。

## Model Experience

无。该界面为操作者折叠已记录的会话投影，从不进入提示词、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送提供方请求。

## Known Limitations and Deferred Work

- **不迁移旧的 `ui-conversation` 统计开关** — 预发布设置文档若把五个字段存在 `ui-conversation` 下，不再生效；若曾自定义，需在 `ui-stats` 下重新切换。
- **窗口回退只覆盖已加载流程** — 没有 `sessionStats` 时，每个数字都从快照里的 assistant `timing` 与工具配对折算，因此已加载事件窗口之外的节点不计入。
