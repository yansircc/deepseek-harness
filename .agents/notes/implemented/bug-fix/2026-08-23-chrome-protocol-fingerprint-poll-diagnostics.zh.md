# Agent Note: Chrome 协议指纹完整性与 poll 解码诊断

Status: implemented

[English](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md) | 中文

## 问题

宿主协议指纹把 `wireCommand.call` 投影成裸的 `{type:'object'}`，因此 nested↔flat 或参数形态漂移不会改变 `protocolFingerprint()`。截图结果选择器仍写嵌套的 `call.operation.*`，而线上 PageCall 已是扁平路径。`EXTENSION_PROTOCOL_FINGERPRINT` 是可与 `protocolFingerprint()` 不一致的硬编码覆盖，打包的 `evidence.json` 也不是唯一钉死权威。非法 long-poll 体在 schema 解码失败时没有可恢复的快速路径，即使 command id 仍在，宿主也要等到邮箱超时（`CommandOutcomeUnknown`）。`readResponseText` 中断清理引用了未定义的 `reader`。

## 决策

在宿主上由原子工具描述符加显式系统 wire 操作（`version`、`cleanup`、`cleanup-all`、`probe`）推导完整的 WireCommand / ForwardRequest / PollResponse call 联合，覆盖扁平 `op`、target、必选/可选字段，并在 PollResponse 中嵌入 WireCommand。截图选择器改为 `call.capture.kind` / `call.format`。以 `assets/browser-extension/evidence.json` 为随包钉死权威；`EXTENSION_PROTOCOL_FINGERPRINT` 读取它；service-worker 的 probe/profile 字面量一致；漂移门断言 computed == evidence == 宿主期望 == 捆绑字面量。捆绑 service worker 将 Effect Schema poll 解码失败格式化为无密钥字段路径与有界摘要 `{type, command:{id/domain/call.op}}`（≤2KB）。当可恢复 `type:'command'` 与 id 时，投递 `CommandRejected` 且 code 为 `poll-response-invalid`；否则记录日志并重试，邮箱超时仍为回退。`readResponseText` 中断时取消 `response.body`。保持扁平 PageCall/InputCall 与系统 `clear-stale`（含弹窗对齐）。

本切片完成 [Chrome 安全的过期所有权恢复](2026-08-23-chrome-safe-stale-ownership-recovery.zh.md) 中延后的指纹对齐。

## 考虑过的替代方案

**保留与旧 evidence 相等的宿主硬编码覆盖，并继续用粗 call 投影。** 否决：钉死值谎报契约覆盖，且允许 nested↔flat 静默漂移。

**要求扩展在握手时重算宿主哈希。** 否决：打包钉死值加漂移门已绑定宿主与随包资产；重算仍需要钉死值才能让旧构建失败关闭。

**解码失败时一律失败 poll fiber 且不投递结果。** 否决：可恢复 id 必须立即释放宿主邮箱。

## 后果

仍使用旧指纹的扩展会失败关闭，直到从当前包装载。带可恢复 id 的非法 poll 命令会以 `poll-response-invalid` 返回宿主/模型，而不是约 30s 的未知结果。wire call 契约变化时，维护者必须同时更新 `evidence.json` 与捆绑字面量。

## 测试

`tests/protocol-fingerprint.spec.ts` 断言钉死对齐，以及 call 联合完整/对嵌套敏感。`tests/poll-diagnostics.spec.ts` 覆盖字段路径、密钥脱敏、长度上界与拒绝形态。`tests/bundled-service-worker-wire-schema.spec.ts` 门控扁平 PageCall/InputCall（SW + popup）、clear-stale、poll 解码辅助与 `readResponseText` body 取消。针对 `packages/chrome/chrome-extension/tests` 的 vitest，以及对 `service-worker.js` 与 `popup.js` 的 `node --check`。
