# @deepseek-ai/dsh-client-ui-schedule

[English](README.md) | 中文

`conversation.input.dock` 里的浏览器提醒条。它读取 Host 计算的 `schedule` 投影，在会话至少有一条活动提醒之前不渲染任何内容。[`@deepseek-ai/dsh-schedule`](../../schedule/schedule/README.zh.md) 拥有持久化、cron 调度以及面向模型的日程工具。

```yaml
- id: ui-schedule
  name: '@deepseek-ai/dsh-client-ui-schedule'
```

## 模型体验

无，因为该条只渲染 Host 投影，不触碰任何提示词、消息、schema、流或工具结果。

#### KV Cache 影响

无；本包从不组装或发送提供方请求。

## 已知局限与延后工作

- **该条只读** — 暂停、恢复、编辑和立即运行仍属于 Host 日程工具以及后续的管理界面。
- **已暂停的记录不出现** — 投影只携带活动提醒，因此暂停的规则会让这条为空。
