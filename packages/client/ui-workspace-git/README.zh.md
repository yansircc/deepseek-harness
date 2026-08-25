# @deepseek-ai/dsh-client-ui-workspace-git

[English](README.md) | 中文

会话页头的工作区 Git 展示及其通用设置开关。片段占用 `conversation.session.header.utilities`（`workspace-git`）；偏好区块占用 `settings.general.item`（`git-display`，order 40）。采样走 Host 的 `workspaceGit.sample` Remote，从不写入会话日志。

```yaml
- id: ui-workspace-git
  name: '@deepseek-ai/dsh-client-ui-workspace-git'
```

`WorkspaceGitSettings`（`$DSH_HOME/settings.yaml` 中的 `ui-workspace-git`）承载四个布尔字段——`showGitBranch`、`showGitDirty`、`showGitUpstream`、`showGitDiffstat`——默认全部打开。`WorkspaceGitDisplayPolicy` 拥有实时记录。四个开关全关则隐藏页头；没有数据的片段在开关打开时仍会隐藏。游离 HEAD 渲染为 `HEAD {sha}`。`+N −M` 相对 HEAD；片段 title 写明这一点。仅当至少一个开关打开且会话 cwd 为非空字符串时，客户端按 `GIT_STATUS_POLL_MS`（5000）轮询。装配中没有本插件或没有 `workspaceGit` Remote 时，该页头席位为空。

## Model Experience

无。该展示为操作者采样 Host 文件系统事实，从不进入 prompt、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送供应商请求。

## Known Limitations and Deferred Work

- **不迁移旧的 `ui-conversation` git 开关** — 预发布设置文档若把这四个字段写在 `ui-conversation` 下，将不再生效；若曾自定义过，需在 `ui-workspace-git` 下重新设置。
