# Agent Note: Chrome 安全的过期所有权恢复

Status: implemented

[English](2026-08-23-chrome-safe-stale-ownership-recovery.md) | 中文

## 问题

浏览器 epoch 变化或已拥有的自动化标签消失后，get/create 路径会抛出 `automation-ownership-lost` 并挡住替换标签。运维与模型没有仅清记录的恢复手段：`cleanup` / `cleanup-all` 会关标签，也没有自动清除已证明安全的过期记录。标签离开常规窗口时，还需要一条从不接管其他标签的显式恢复路径。

## 决策

注册系统域原子工具 `chrome_automation_status` 与 `chrome_automation_clear_stale`。捆绑的 service worker 增加 `clear-stale`：只删除已证明过期的所有权记录，从不关闭或接管标签。get/create 继续之前，`withTargetTurn` 仅自动协调 `epoch-changed` 与 `tab-missing`。从不自动清除 `tab-outside-regular-profile`；该情形的所有权错误会点名 `chrome_automation_clear_stale`。扩展弹窗提供同源恢复按钮，可报告并清除配置级过期记录，不展示密钥，也不提供破坏性 cleanup 控件。宿主 operation/result/deadline 契约与打包 SW 片段包含 `clear-stale`。协议指纹钉死对齐见 [Chrome 协议指纹完整性与 poll 解码诊断](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md)。

## 考虑过的替代方案

**在 get/create 上自动清除每一种过期原因。** 否决：离开常规配置的标签在没有运维或模型显式动作时不应丢弃。

**用 `cleanup` 做恢复。** 否决：cleanup 会关闭已拥有标签；过期恢复必须只动记录。

**在本切片更新指纹钉死值。** 当时否决；已在 [Chrome 协议指纹完整性与 poll 解码诊断](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md) 完成。

## 后果

epoch 与缺标签所有权在自动协调后不再挡住替换。记录的标签离开常规窗口时仍需显式清除。

## 测试

`packages/extensions/tool-chrome/tests/plugin.spec.ts` 期望 27 个原子工具加 `chrome_status`。`automation-stale-recovery.spec.ts` 钉死系统描述符与宿主 clear-stale 契约。`bundled-service-worker-wire-schema.spec.ts` 钉死捆绑 `clear-stale`、自动协调原因、仅记录语义与弹窗恢复消息。针对 `packages/extensions/tool-chrome/tests` 的 `vitest`，以及对 `service-worker.js` 与 `popup.js` 的 `node --check`。
