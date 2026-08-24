# Agent Note: Cursor ACP client extensions are acknowledged and dropped

Status: implemented

English | [中文](2026-08-24-cursor-acp-client-extensions.zh.md)

## Problem

A Cursor `agent acp` child sends editor-only JSON-RPC requests such as `cursor/update_todos` (TodoWrite) to the ACP client. The DSH client implemented `session/update` and `session/request_permission` only. The ACP SDK then answered `-32601` and logged `Error handling request` on the `dsh web` process. The child turn can continue after that error, but the host log looks like a web failure, and a child that awaits the extension RPC sees a failed method.

## Decision

`ClientSideConnection` in `dsh-subagent-cursor` implements `extMethod` and `extNotification`. Every method that starts with `cursor/` returns an empty object. Any other unmatched method still throws `RequestError.methodNotFound`. The payload is not written to the parent Session.

## Alternatives considered

**Copy `cursor/update_todos` into the parent `todo/write` event.** Rejected: the parent Session would show the child's plan as the user's plan, and the package already keeps Cursor tool activity out of the parent log.

**Acknowledge every unmatched ACP extension, not only `cursor/`.** Rejected: a non-Cursor child that sends an unknown method should still fail closed so a protocol mismatch stays visible.

**Leave the `-32601` and treat the host log as noise.** Rejected: the SDK logs every failed request, and a child that awaits the RPC observes a hard method error.

## Consequences

`cursor/update_todos` no longer appears as `Method not found` on the host. Parent UI still has no child todo list. A later Cursor editor method under the same prefix is acknowledged the same way. Generic `dsh-subagent-acp` still rejects these methods unless it points at this Cursor backend.

## Testing

`packages/subagent/subagent-cursor/tests/client-extensions.spec.ts` accepts `cursor/` methods and rejects `other/foo`. `packages/subagent/subagent-cursor/tests/subagent-cursor.spec.ts` drives the mock ACP agent to call `cursor/update_todos` plus a `cursor/` notification, asserts the extension result is `{}` and the turn completes, then asserts a non-Cursor unmatched method settles `error`.
