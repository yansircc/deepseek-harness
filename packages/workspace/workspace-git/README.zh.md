# @deepseek-ai/dsh-workspace-git

[English](README.md) | 中文

发布 `ctx.workspaceGit.sample(cwd)` 的 Host 插件：为一个目录采样 git 事实，供会话页头展示。采样是对操作者工作树的 Host 读取。它从不写入会话日志，从不注入提示词，也不会计为相对本会话的改动。

## 采样

- `git rev-parse --is-inside-work-tree` — 未命中、裸仓库、缺少 git 可执行文件或超时均返回 `{ present: false }`。
- `git rev-parse --short HEAD` — `shortHead`。尚无提交的空仓库视为未命中。
- `git symbolic-ref --short HEAD` — 附着时为 `branch`；游离时省略。游离态的展示由消费者写成 `HEAD {shortHead}`。
- `git status --porcelain=v1 --branch` — `dirty` 是 porcelain 条目数，包含未跟踪（`??`）。仅当分支行标出非零侧时才出现 `ahead` / `behind`。
- `git diff --shortstat HEAD` — 相对 HEAD 的 `insertions` / `deletions`。未跟踪文件不出现在这里。

`timeoutMs`（默认 5000，最小 1）是唯一的 Config 字段，覆盖一次 `sample()` 中的全部子进程。客户端轮询节奏是单独的 UI 常量。

## 组合

```yaml
- id: workspace-git
  name: '@deepseek-ai/dsh-workspace-git'
```

web-app bundle 把这一行挂在 `api-gateway` 之前。网关在调用时读取 `ctx.get('workspaceGit')`，并不注入该服务，因此未挂本插件的装配仍能启动；此时 `workspace.gitStatus` 以 `internal` 失败。

## 模型体验

无，因为插件只为客户端页头采样宿主文件系统，不触碰任何提示词、消息、schema、流或工具结果。

#### KV Cache 影响

无；插件从不组装或发送提供方请求。

## 已知局限与延后工作

- **未命中即隐藏页头** — 不是工作树、PATH 上没有 git、服务层空路径或超时都解析为 `{ present: false }`；网关还会对空 RPC 路径返回 `workspace-invalid-path`。
- **增删行相对 HEAD，不是本会话** — 页头 title 写明这一点；没有相对本会话的 `+N −M`。
- **未跟踪文件只增加 `dirty`** — 它们不出现在 `insertions` / `deletions` 中。
