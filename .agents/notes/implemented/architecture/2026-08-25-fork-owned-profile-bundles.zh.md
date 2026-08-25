# Agent Note: Fork 自有 Profile 组合包保持上游 base/web-app 干净

Status: implemented

[English](2026-08-25-fork-owned-profile-bundles.md) | 中文

## Problem

本 fork 的 Chrome、zeroY、Schedule UI、list-models、session-tool-stats 与 workspace-git 组合行曾写在上游持有的 `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app` patch 里。每次从官方合并 `dsh-base`／`dsh-web-app` 都要再打一遍这些插入，而上游包也无法在 fork 仍默认交付这些能力的同时保持接近 deepseek-ai。

## Decision

把 fork 自有配置行迁到显式的内置 Profile 组合包：

- `@deepseek-ai/dsh-fork-base` 在 `dsh-base` 之后插入 Host 平面的 `tool-list-models`、`tool-zeroy` 与 `tool-chrome`。
- `@deepseek-ai/dsh-fork-web` 在 `dsh-web-app` 之后插入 workspace-git、session-tool-stats、time-context、schedule 及对应客户端 UI 行，并禁用 Host 平面的 `tool-list-models`，让 agent preset 拥有该工具。

随附模板变为：

- web：`dsh-base` → `dsh-fork-base` → `dsh-web-app` → `dsh-fork-web`
- headless：`dsh-base` → `dsh-fork-base` → `dsh-headless`

`apps/cli` 依赖这两个 fork 组合包，使安装优先解析与每次启动修复的 `$DSH_HOME/profiles/node_modules` 回退继续覆盖其依赖闭包。`loadProfile` 把精确的既有安装拥有 web／headless 元组改写到新模板。Cursor 仍是独立的可选组合包 `@deepseek-ai/dsh-subagent-cursor`（已在 `dsh-base` 之外）；它不是默认模板的一部分。

上游 `dsh-base` 与 `dsh-web-app` 的 patch 与依赖清单在这些行上回到官方内容。

## Alternatives considered

**把 fork 行继续留在 dsh-base／dsh-web-app。** 否决：会对上游留下永久、最大的合并 diff。

**用一个元 fork 组合包覆盖所有平面。** 否决：headless 需要 Host 工具但不需要 Web UI，而 web 必须在 web-app 把 agent 平面挪走之后再禁用 Host 平面的 list-models；两层与这些平面一致。

**让 fork 能力仅通过 `dsh plugin add` 可选启用。** 否决：会改变本 fork 默认的 `dsh web`／`dsh --profile headless` 行为。

## Consequences

获得：上游 base／web-app 可合并；fork 默认仍保留 Chrome、zeroY、Schedule、list-models、统计与工作区 git；Cursor 仍是显式可选组合包。

代价：多两个内置组合包、既有 profile 的模板迁移，以及硬编码 web 层栈的 scaffold／测试必须列出 fork 层。

## Testing

`packages/bundle/fork-base/tests/fork-base.spec.ts` 与 `packages/bundle/fork-web/tests/fork-web.spec.ts` 固定 patch 行与依赖。`packages/bundle/base/tests/base.spec.ts` 断言 fork 工具行不在上游 base 中。`packages/boot/app-boot/tests/profile.spec.ts` 固定模板内容与安装拥有元组规范化。Web e2e scaffold 与 web-agent-presets 组合应用四层 web 栈。
