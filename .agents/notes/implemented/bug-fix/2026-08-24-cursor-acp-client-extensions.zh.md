# Agent Note: Cursor ACP 客户端扩展会被确认并丢弃

Status: implemented

[English](2026-08-24-cursor-acp-client-extensions.md) | 中文

## Problem

Cursor 的 `agent acp` 子进程会把仅编辑器使用的 JSON-RPC 请求（例如 TodoWrite 对应的 `cursor/update_todos`）发给 ACP 客户端。DSH 客户端只实现了 `session/update` 和 `session/request_permission`。ACP SDK 于是应答 `-32601`，并在 `dsh web` 进程里打出 `Error handling request`。子轮次在这条错误之后往往还能继续，但宿主日志看起来像 web 失败，而且如果子进程在等这条扩展 RPC，它会看到方法失败。

## Decision

`dsh-subagent-cursor` 里的 `ClientSideConnection` 实现 `extMethod` 和 `extNotification`。凡是以 `cursor/` 开头的方法都返回空对象。其它未匹配方法仍然抛出 `RequestError.methodNotFound`。载荷不会写入父会话。

## Alternatives considered

**把 `cursor/update_todos` 抄进父会话的 `todo/write` 事件。** 未采纳：父会话会把子代理的计划显示成用户计划，而且本包已经约定 Cursor 工具活动不进入父日志。

**确认所有未匹配的 ACP 扩展，不只是 `cursor/`。** 未采纳：非 Cursor 子进程发来未知方法仍应失败关闭，协议不匹配必须可见。

**保留 `-32601`，把宿主日志当噪音。** 未采纳：SDK 会记录每条失败请求；等待该 RPC 的子进程会看到硬性方法错误。

## Consequences

`cursor/update_todos` 不再以 `Method not found` 出现在宿主上。父 UI 仍然没有子代理的 todo 列表。之后同前缀的 Cursor 编辑器方法也会被同样确认。通用 `dsh-subagent-acp` 仍会拒绝这些方法，除非走的是这个 Cursor 后端。

## Testing

`packages/subagent/subagent-cursor/tests/client-extensions.spec.ts` 接受 `cursor/` 方法并拒绝 `other/foo`。`packages/subagent/subagent-cursor/tests/subagent-cursor.spec.ts` 驱动 mock ACP agent 调用 `cursor/update_todos` 加上一条 `cursor/` 通知，断言扩展结果是 `{}` 且轮次完成，然后再断言非 Cursor 的未匹配方法会以 `error` 结束。
