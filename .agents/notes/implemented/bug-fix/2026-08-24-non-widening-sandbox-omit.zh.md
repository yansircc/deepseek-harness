# Agent Note: Non-widening sandbox_permissions is omitted

Status: implemented

[English](2026-08-24-non-widening-sandbox-omit.md) | 中文

## Problem

`approveEscalation` 会拒绝任何不严格宽于调用有效模式的 `sandbox_permissions`。已经处于 `danger-full-access`（Full access 预设）的会话里，只要 bash 或 fs 调用仍带 `sandbox_permissions: "danger-full-access"`，就会失败。按 Codex 风格工具训练的模型几乎每次都会带上这对参数。命令因此永远跑不起来。

原先的 fail-closed 规则写在[沙箱决策](../feature/2026-07-06-sandbox.zh.md)里。它避免无操作升级弹出审批。它同时也挡住了这种习惯性的同级请求。

## Decision

不严格更宽的请求——同一档、更窄的一档，或未知的有效模式——返回有效模式，并且不发起提示。严格更宽的请求仍在执行前走审批。`bash`、`pwsh` 和文件系统变更工具共用 `approveEscalation`，因此一并按省略处理。

## Alternatives considered

**继续让同级请求失败。** 未采纳：会话已经拥有所请求的访问，模型只会反复重试同一对注定失败的参数。

**只把 `danger-full-access` → `danger-full-access` 当作省略。** 未采纳：`workspace-write` → `workspace-write` 是同一习惯，只是低一档。

**改工具 schema，写明「已在该模式时请省略」。** 未采纳：这会重生成工具目录和组装后的系统提示词 snapshot。执行期按省略处理，与「省略该字段」的原意一致。

## Consequences

习惯性的同级 `sandbox_permissions` 会按当前模式运行。真正更宽的请求仍会提示。schema 文案不变。没有组装 snapshot 钉住同级请求成功；包测试钉住省略行为。

## Testing

`packages/sandbox/sandbox/tests/escalation.spec.ts` 对同级、更窄和最高档请求返回有效模式，并断言不发起审批。`packages/shell/tool-bash/tests/tools.spec.ts` 与 `packages/shell/tool-pwsh/tests/tools.spec.ts` 跑这些调用时无错误、无提示。
