# @deepseek-ai/dsh-workspace-git

[English](README.md) | 中文

Host 插件以 Typert Remote `workspaceGit.sample` 发布 `ctx.workspaceGit.sample(cwd, signal)`：为一个目录采样 git 事实，供会话页头展示。采样是对操作者工作树的 Host 读取。从不写入会话日志，从不注入提示词，也不计入会话相对变更。

## Sample

- `git rev-parse --is-inside-work-tree` — 未命中、裸仓库、缺少 git 二进制或超时返回 `{ present: false }`。
- `git rev-parse --short HEAD` — `shortHead`。尚无提交的空仓库视为未命中。
- `git symbolic-ref --short HEAD` — 附着时给出 `branch`；游离时省略。游离展示由消费方渲染为 `HEAD {shortHead}`。
- `git status --porcelain=v1 --branch` — `dirty` 为 porcelain 条目数（含未跟踪 `??`）。仅当分支行给出非零一侧时才出现 `ahead` / `behind`。
- `git diff --shortstat HEAD` — 相对 HEAD 的 `insertions` / `deletions`。未跟踪文件不出现在此。

`timeoutMs`（默认 5000，最小 1）是唯一 Config 字段，覆盖一次 `sample()` 中的全部子进程。调用方取消是 Remote 末位 `signal` 参数，并与该预算合并。客户端轮询节奏是独立的 UI 常量。

## Composition

```yaml
- id: workspace-git
  name: '@deepseek-ai/dsh-workspace-git'
```

web-app 捆绑包挂载本行，使 live Typert 网关能解析 `ctx.workspaceGit`。Client 装配通过 `@deepseek-ai/dsh-api-remotes/client` 挂载生成的 `/remote` 贡献。没有本 Host 插件的装配仍能启动；此时 `workspaceGit.sample` 在网关失败，UI 将未命中当作 `{ present: false }`。

## Model Experience

无；本插件只为主机文件系统采样供客户端页头展示，不触及提示词、消息、schema、流或工具结果。

#### KV Cache effect

无；本插件从不组装或发送 provider 请求。

## Known Limitations and Deferred Work

- **未命中则隐藏展示** — 非工作树、PATH 上无 git、空路径、超时或调用方中止都解析为 `{ present: false }`。
- **Diffstat 相对 HEAD，而非本次对话** — 页头 title 写明这一点；没有会话相对的 `+N −M`。
- **未跟踪文件只抬高 `dirty`** — 不出现在 `insertions` / `deletions` 中。
