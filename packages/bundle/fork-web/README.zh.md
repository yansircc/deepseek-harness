# `@deepseek-ai/dsh-fork-web`

English | [中文](README.md)

叠在 [`dsh-web-app`](../web-app/README.zh.md) 之上的 fork 自有浏览器表层：[`cordis.patch.yml`](cordis.patch.yml) 插入工作区 git 采样与页头、会话工具调用统计、Schedule 与时间上下文，以及 zeroY／Chrome 设置卡片，并禁用 [`dsh-fork-base`](../fork-base/README.zh.md) 中 Host 平面的 `tool-list-models` 行，让 agent preset 拥有该工具。默认 web Profile 模板在 `dsh-web-app` 之后立刻应用本组合包。上游 `dsh-web-app` 不挂载这些行。该包没有运行时 API；profile 组合器通过 manifest（元数据清单）的 `dsh.bundle.patch` 字段解析 patch。

## Model Experience

间接地，通过所插入的 Host 行：Schedule 在根 agent 上注册模型可见的提醒工具；时间上下文贡献请求上下文。客户端 UI 行不注册任何模型可见内容。

#### KV Cache effect

UI 行无直接效果；Schedule 与 time-context 包各自拥有其效果。

## Known Limitations and Deferred Work

- **patch 会整行替换 config** — profile 覆盖必须重述该行要保留的每个字段；没有深合并层。
- **禁用 list-models 依赖前一层 fork-base** — 若尚无 `tool-list-models` 行，禁用条目无效。
