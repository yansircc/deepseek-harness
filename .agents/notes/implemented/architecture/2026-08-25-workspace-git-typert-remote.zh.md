# Agent Note: Workspace Git 自有 Typert Remote 端点

Status: implemented

[English](2026-08-25-workspace-git-typert-remote.md) | 中文

## Problem

`workspace.gitStatus` 落在固定的 Host apiproxy workspace RPC 映射上，而实现只是可选的 `ctx.get('workspaceGit')` 查找加一次采样。这把浏览器契约重复写进 apiproxy schema、路由、客户端 stub、fixture 与业务包，并在 Typert Remote 已承载其他一元 Host 读取之后，仍把 cwd 采样留在手写的 workspace 域（[一元迁移提案](../../proposed/architecture/2026-08-10-unary-apiproxy-remote-migration.zh.md)）。更早的显示开关笔记因 workspace 域已有 `IApiClient` 面而否决 Remote；该理由把传输所有权与 workspace 注册表域绑死了。

## Decision

`@deepseek-ai/dsh-workspace-git` 是 Cordis 键 / 线命名空间 `workspaceGit` 上的 `TypertRemoteService`。它用 `@Remote('sample')` 装饰 `sample(cwd, signal)`。方法返回包 `./types` 导出的 `WorkspaceGitSample`。调用方取消是末位 `AbortSignal`，经 `AbortSignal.any` 与 Config `timeoutMs` 合并。空 cwd、缺少 git、非工作树、超时与中止仍解析为 `{ present: false }`。

`@deepseek-ai/dsh-api-remotes/client` 挂载生成的 `/remote` 贡献。`@deepseek-ai/dsh-client-ui-workspace-git` 通过本地 Remote 面类型调用 `ctx.remote.workspaceGit.sample`，并把任何失败映射为 `{ present: false }`。手写的 `workspace.gitStatus` 方法、schema、路由、stub、fixture 以及 `WorkspaceGitStatus` 重声明从 apiproxy 与 client connection 移除。

这取代了[会话显示开关](../feature/2026-08-20-conversation-display-toggles.zh.md)中「用 Typert remotes 承载 `workspace.gitStatus`」的否决：该采样不是 workspace 注册表操作，因此不属于那张固定 RPC 面。

## Alternatives considered

**把 `workspace.gitStatus` 留在 apiproxy。** 否决，因为该调用有自然的 Service 所有者且无 BFF 生命周期策略；重复的线面正是 Typert Remote 要删掉的。

**仅为 Remote 适配器建伴生包。** 否决，因为现有服务签名就是消费方契约；恒等 `remote*` 包装会多一个没有独立所有者的包。

**保留空路径的 `workspace-invalid-path`。** 否决，因为服务对空 cwd 已返回 `{ present: false }`，且 UI 已把每次 Remote/RPC 未命中折叠成该值。

## Consequences

cwd git 采样由 `workspace-git` 加上选定的 api-remotes 挂载端到端拥有。没有 Host 插件的装配仍能启动；采样在网关失败，页头保持为空。快照 fixture 不再需要 stub 的 `workspace.gitStatus` 行。

## Required verification

- 包测试覆盖 Remote 绑定名、Loader 组合、timeout 与调用方中止，以及真实临时仓库采样。
- 聚焦的 apiproxy 与 connection 测试不再注册 `workspace.gitStatus`。
- `ui-workspace-git` 浏览器插件规格驱动 `ctx.remote.workspaceGit.sample`（含取消）。
- Host build 为 `dsh-workspace-git` 生成 `./typert` 与 `./remote`；api-remotes 挂载该贡献。
