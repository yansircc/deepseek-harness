# `@deepseek-ai/dsh-fork-base`

English | [中文](README.md)

叠在 [`dsh-base`](../base/README.zh.md) 之上的 fork 自有 Host 工具层：[`cordis.patch.yml`](cordis.patch.yml) 插入 `tool-list-models`、`tool-zeroy` 与 `tool-chrome`。默认的 web 与 headless Profile 模板在 `dsh-base` 之后立刻应用本组合包。上游 `dsh-base` 不挂载这些行。可选的 Cursor provider 仍是独立可安装的组合包（[`dsh-subagent-cursor`](../../subagent/subagent-cursor/README.zh.md)）；本包既不依赖也不挂载它。该包没有运行时 API；profile 组合器通过 manifest（元数据清单）的 `dsh.bundle.patch` 字段解析 patch。

## Model Experience

间接地，通过所插入的各行：每个工具包拥有各自的模型可见 schema 与结果。本组合包自身不贡献任何模型可见文本。

#### KV Cache effect

无直接效果；各插入行所属的包各自拥有其效果。

## Known Limitations and Deferred Work

- **patch 会整行替换 config** — profile 覆盖必须重述该行要保留的每个字段；没有深合并层。
- **Web 会在 Host 平面禁用 `tool-list-models`** — [`dsh-fork-web`](../fork-web/README.zh.md) 关掉 Host 行，让 agent preset 拥有目录工具。
