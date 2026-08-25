# @deepseek-ai/dsh-session-tool-stats

[English](README.md) | 中文

注册 `sessionToolStats` projection 单元的函数插件：从 `tool/call` → `tool/result` 配对折叠出全日志已配对工具调用次数，经 session-projection 缝对外提供（registry 快照、变更流，以及每一个 projection 载体：history 尾页、`session/projection` 推送帧、会话列表行）。客户端由此渲染分页与压缩都无法改变的全会话工具次数；参考消费者是 Web 聊天统计条，它将本单元与 `sessionStats.toolMs` 组合成 `工具 {count}次 {duration}` 分组。

## 折叠语义

- `toolCalls` 按 callId 统计已配对的 `tool/call` → `tool/result` 次数。未解决的调用在 `turn/end` 时丢弃（结果总在其轮内落地），不计入次数。无前置 call 的孤儿 result 被忽略。
- 次数在首个已配对之前为 0。已装配的 registry 恒提供该键，客户端读取值本身，而非键的存在性。
- 墙钟时间仍由 `sessionStats.toolMs` 承载；本单元只拥有次数，使上游 `sessionStats` 包可保持不含本地次数字段。

## 组合

```yaml
- id: session-tool-stats
  name: '@deepseek-ai/dsh-session-tool-stats'
```

注入 `sessionProjections`——这是插件的全部用途；在没有 registry 的装配中 fiber 保持挂起，不注册任何内容。当消费者同时需要时长与次数时，与 `@deepseek-ai/dsh-session-stats` 并排挂载。

## 模型体验

无，因为插件只计算面向客户端的、由已写入日志的会话事件派生的读模型，不触碰任何提示词、消息、schema、流或工具结果。

#### KV Cache 影响

无；插件从不组装或发送提供方请求。

## 已知局限与延后工作

- **计数是日志口径，不是 surface 口径**——结果后来被压缩掉的工具配对仍然计入；数字描述整个会话，而非当前模型可见 surface。
- **仅挂载于 web-app bundle**——其他装配不提供 `sessionToolStats` 键，其消费者回退到窗口口径计数（Web 统计条的回退路径）。
