# Agent Note: Web 回放对齐已交付组合

Status: implemented

[English](2026-08-25-web-replay-shipped-composition-baseline.md) | 中文

## Problem

在 schedule、time-context、Chrome/zeroY 以及 StatsLine 的 Tools/Uncached 进入默认 Web 树之后，`DSH_SNAPSHOT=replay pnpm run test:web` 不再是可信的本地信号：预期输出、overlay 与部分组合断言仍描述交付前的界面。失败混杂有意过期的 golden、真实组合缺陷，以及共享 setup 触发的级联断言，难以判断该刷新还是该修。

## Decision

把当前已交付的 Web 组合当作回放基线：

- `examples/web-schedule/cordis.yml` 保留为文档化的空 overlay，避免这些行迁入 `packages/bundle/web-app/cordis.patch.yml` 后 Loader 再看到重复的 `time-context` / `schedule` id。
- `shipped-composition` 与 `minimal-preset` 把宿主平面的 Chrome/zeroY 工具以及 Agent 作用域的 Schedule 工具钉为有意目录成员。
- `pnpm run test:web` 与 `test:web:refresh` 通过 `build:official` 构建，使本地回放与 CI 注册官方品牌 occupant 的 client 配置一致；`built-boot` 仍按记录的 `DSH_CLIENT_BUILD_PROFILE` 分支。
- 仅刷新经评审的有意 aria 差异：time-context 注入行、StatsLine 的 Tools/Uncached 文案，以及 Chrome/zeroY 插件卡片。
- Trajectory 流式滚动预算从 5 提到 6，以吸收已交付 time-context 行带来的额外布局轮次，同时仍能抓住失控滚动。
- 可配置插件卡片按 namespace id 排序，避免异步 client 激活打乱注册顺序时 Chrome/zeroY（以及之后的同类卡片）在多次启动间互换位置。
- `DSH_WEB_SNAPSHOT_WORKERS=1` 为并行浏览器 scaffold 会耗尽临时端口的宿主选择串行 built runner；大于一的值继续使用有界 CI runner。

## Alternatives considered

**把 Chrome/zeroY 挪到 agent preset，让全局 tools 层保持为空。** 本基线不采纳：两个插件还拥有进程单例宿主状态（Chrome 桥、zeroY 站点绑定）。拆分宿主与工具包是另一次组合变更。

**`test:web` 继续用非 official 构建，只放宽品牌断言。** 作为默认路径不采纳：CI 已在 Web 回放前构建 official 产物，本地非 official 构建会让品牌与配置相关信号继续偏离门禁。

**盲目刷新所有失败 golden。** 不采纳：共享 setup 的级联（assertConsumed、子代理 FIFO 长度）只有在有意 golden 与组合断言先纠正后才会消失。

## Consequences

本地 `DSH_SNAPSHOT=replay pnpm run test:web` 会重建 official client 产物，并与描述已交付 schedule/time-context/Chrome/zeroY/StatsLine 界面的 golden 比较。schedule overlay 本身不再激活提醒；默认 Web 树已经激活。以后新增宿主平面工具时，必须在同一变更中更新 `shipped-composition` 以及任何 minimal-preset 工具清单。

## Testing

验收门禁是 `DSH_SNAPSHOT=replay pnpm run test:web`。本基线的聚焦覆盖包括 `schedule-after.e2e.ts`、`shipped-composition.e2e.ts`、`minimal-preset.snapshot.ts`、`built-boot.snapshot.ts`、`plugin-config.e2e.ts` 与 `trajectory-virtualization.e2e.ts`。
