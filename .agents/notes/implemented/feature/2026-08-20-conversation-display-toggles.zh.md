# Agent Note: Conversation display toggles for the stats line and workspace git

Status: implemented

[English](2026-08-20-conversation-display-toggles.md) | 中文

## Problem

编辑器统计行只要有数据就会画出全部分组，会话页头也没有工作区 git 信息。需要更安静页脚、或需要在工作时看到分支／脏文件／上游／相对 HEAD 增删行的操作者，既没有按分组控制，也没有一份不进入会话日志的 Host 采样。

## Decision

`ConversationSettings`（`$DSH_HOME/settings.yaml` 中的 `ui-conversation`）在 `busyEnter` 旁携带九个布尔字段，默认全部为开。只存了 `busyEnter` 的旧文档经 schema 默认值补齐。`ConversationDisplayPolicy` 拥有实时记录；`ComposerSubmissionPolicy` 仍只负责繁忙态 Enter。

通用设置注册两个区块：stats-display（order 30）与 git-display（order 40）。每个开关都是 `role="switch"`。没有数据的分组或片段在开关打开时仍会隐藏。五个统计开关全关则隐藏统计行；四个 git 开关全关则隐藏 git 页头。

统计行仍在 `conversation.composer.dock`。上下文占用仍在 `ContextMeter`。提供方／模型／思考力度仍在编辑器模型座位。耗时分组加入已配对工具调用次数（`工具 {count}次 {duration}`）。token 分组为 `未缓存 · 输入 · 输出`（计费输入仍是未缓存 + cacheRead + cacheWrite）。`sessionStats` 在与 `toolMs` 相同的 `tool/call` → `tool/result` 配对上增加 `toolCalls`，`stateVersion` 为 2。`turn/end` 时未配对的残留不计。窗口回退统计带 `callTime` 的 `tool-result` 节点。

工作区 git 是 Host 采样，不是会话投影，从不写入会话日志。`@deepseek-ai/dsh-workspace-git` 发布 `ctx.workspaceGit.sample(cwd)`（`timeoutMs`，默认 5000）。手写的 `workspace.gitStatus({ path })` 在 apiproxy 中重声明 `WorkspaceGitStatus`，使浏览器契约不依赖 Host 包。网关使用 `ctx.get('workspaceGit')`，并不注入该服务。缺少插件以 `internal` 失败；空路径以 `workspace-invalid-path` 失败；任何客户端 RPC 错误都变成 `{ present: false }`。组装 fixture 与 `FakeApiClient` 恒返回 `{ present: false }`，快照不会采样真实工作树。

页头占用 `conversation.session.header.utilities`（`workspace-git`）。游离 HEAD 是分支片段的展示方式（`HEAD {sha}`），不是第十个开关。`+N −M` 相对 HEAD；片段 title 写明这一点。仅当至少一个 git 开关打开且会话 cwd 为非空字符串时，客户端按 `GIT_STATUS_POLL_MS`（5000，UI 常量）轮询。

## Alternatives considered

**主开关「显示统计／显示 git」再加上分组开关。** 否决，因为一个区块全部关闭已经隐藏该展示，第十个控件只会重复同一决定。

**把 git 事实放进会话投影或会话日志。** 否决，因为模型可见输入必须能从日志重建，而这页头是 Host 文件系统读取，不是会话事件。

**用 Typert remotes 承载 `workspace.gitStatus`。** 否决，因为 workspace 域已经是手写的 `IApiClient` 面；第二套 remote 栈会把同一域拆进两套注册表。

**在 `ApiProxyService` 上注入 `workspaceGit`。** 否决，因为没有该插件的装配会让网关一直 pending。

**相对本会话的 `+N −M`。** 否决，因为产品数字是工作树相对 HEAD；把它算作「本会话」是错的。

**把上下文占用或提供方／模型／思考力度再做成开关。** 否决，因为这些事实已有其他归属（ContextMeter、编辑器模型座位）。

## Consequences

操作者可以单独隐藏统计行分组和 git 片段，而不丢掉其余项。没有 `workspace-git` 的装配仍能启动；页头保持为空。快照回放永远看不到真实工作树。`sessionStats` 缓存升到 `stateVersion` 2 并重建。

## Testing

包测试覆盖 schema 默认值、display-policy 的采纳／写入、两个通用设置行、StatsLine 分组开关以及新的 token 与工具次数文案、`toolCalls` 配对、git porcelain／shortstat 解析、真实临时仓库采样、Loader 组合、`workspace.gitStatus` 的空路径与缺插件错误码、fixture 的 `{ present: false }`，以及页头片段轮询。组装后的 settings-chrome 对话框快照包含这两个通用区块。
