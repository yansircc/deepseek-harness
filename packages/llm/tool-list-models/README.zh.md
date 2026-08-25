# @deepseek-ai/dsh-tool-list-models

[English](README.md) | 中文

全局具名的 `list_models` 工具是 `ctx.llm` 之上的轻量 Consumer。它投影实时的提供方／模型目录，以便父级在进程内委派工具上设置每次调用的 `provider`、`model` 或 `reasoning_effort` 之前先检查已注册路由。本包不依赖 subagent 控制工具；部署可以挂载此目录而不挂载子级消息发送或发现。

`list_models` 接受可选的 `provider`。无参数时返回每个已注册 LLM 路由及其目录模型 id。带 `provider` 时返回该路由的模型，以及每个模型的 `contextWindow` 与 `reasoning_efforts`。空或仅空白的 `provider` 值按省略处理。它不要求调用方 agent，也不列出 Cursor、Claude Code 或 Codex 等产品 subagent 传输。

## 模型体验

### 工具 schema

#### 模型看到的内容

已生成的 [`list_models` schema](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-list-models)：可选的 `provider` 路由 id。

#### Token 影响

工具可见时，每个请求支付固定的 schema 成本。

#### KV Cache 影响

前缀保持稳定；schema 不会在运行时改变。

### 目录结果

#### 模型看到的内容

省略 `provider` 时，每个已注册 LLM 路由一行：`<id> (<name>): <model ids>` 或 `(no models)`。设置 `provider` 时，先是一个提供方，再是每个模型一行：`<id> (<name>) contextWindow=<n> reasoning_efforts=<ids>`。`(no providers)` 表示未注册适配器。产品 subagent 传输永不出现。未知的非空白路由 id 会成为出错结果，并点名缺失的提供方。

#### Token 影响

随已注册目录增长——总览调用包含每条路由，提供方调用包含每个模型；没有 cursor。

#### KV Cache 影响

仅追加；每次结果都位于可复用请求前缀之后。

## 已知限制与暂缓事项

- **模型目录是实时适配器快照** — 父级正在使用的路由可能未列入目录，而进程内委派上的显式 `provider`／`model` 选择仍要求目录成员资格。
- **产品 subagent 传输不在此目录中** — Cursor、Claude Code 与 Codex 不是 LLM 提供方路由；在此列出它们会混入不兼容的选择词汇。
