# Agent Note: 工作区 Git UI 是独立客户端插件

Status: implemented

[English](2026-08-25-ui-workspace-git-client-plugin.md) | 中文

## Problem

工作区 Git 页头展示及其通用设置开关原先放在 `@deepseek-ai/dsh-client-ui-conversation` 内，与统计行显示偏好并列。这让可选的 Host 文件系统采样看起来像会话域 chrome，迫使 `ui-conversation` 拥有采样调用点，并让页头工具席位与对话插件图及其 git 字段绑在一起。

## Decision

`packages/client/ui-workspace-git` 下的 `@deepseek-ai/dsh-client-ui-workspace-git` 拥有 `WorkspaceGitChip`、`GitDisplayRow`、四个显示开关、locale 文案、CSS 以及 Host schema 注册。它通过 `ctx.slots.inject` 贡献到既有的 `conversation.session.header.utilities` 与 `settings.general.item` 席位。显示行为与原先一致：四个布尔默认打开，全关隐藏片段行，游离 HEAD 渲染为 `HEAD {sha}`，`+N −M` 相对 HEAD，仅当开关打开且 cwd 为非空字符串时按 `GIT_STATUS_POLL_MS`（5000）轮询。

持久偏好使用 `ui-workspace-git` 设置命名空间，字段名不变（`showGitBranch`、`showGitDirty`、`showGitUpstream`、`showGitDiffstat`）。`ui-conversation` 只保留 `busyEnter` 与五个统计行开关。采样经 `ctx.get('remote.workspaceGit')` 调用 Host 的 `workspaceGit.sample` Typert Remote（[Remote 所有权](2026-08-25-workspace-git-typert-remote.zh.md)）。已发布的 web-app bundle 在 `ui-conversation` 旁加载新行。

交叉链接：开关与 Host 采样的产品行为仍记录在[对话显示开关](../feature/2026-08-20-conversation-display-toggles.zh.md)。

## Alternatives considered

**把 git 展示留在 `ui-conversation`。** 否决：采样从不触及会话日志或统计投影，且采样调用点只为该席位存在。

**把四个开关继续放在 `ui-conversation` 设置命名空间。** 否决：从 `ConversationSettings` 移除 git 字段才是所有权切割；预发布允许新命名空间而不做迁移垫片。

**抽取 UI 包时改 Host 采样传输。** 当时推迟；现已单独完成，从 apiproxy 迁到 `workspaceGit.sample`（[Remote 所有权](2026-08-25-workspace-git-typert-remote.zh.md)）。

## Consequences

获得：可不拥有对话设置而可选挂载工作区 git 展示；`ui-conversation` 不再拥有 git 采样调用点；包与 slot 目录所有权与功能一致。

代价：多一个客户端插件与 bundle 行；原先磁盘上的 `ui-conversation` git 开关被忽略，需在 `ui-workspace-git` 下重新设置。

## Testing

`packages/client/ui-workspace-git/tests/` 覆盖 schema 默认值、display-policy 采纳／写入、GitDisplayRow、WorkspaceGitChip 轮询／中止，以及两个 slot 的 apply 接线。`ui-conversation` 的 apply 规格断言不再注册 git。`pnpm run test:gui` 覆盖这对 GUI 包。
