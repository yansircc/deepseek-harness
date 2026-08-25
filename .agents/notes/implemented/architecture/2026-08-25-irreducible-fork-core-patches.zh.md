# Agent Note: 上游 core／共享文件上的不可再减 fork 补丁

Status: implemented

[English](2026-08-25-irreducible-fork-core-patches.md) | 中文

## Problem

在 Profile Bundle、Stats UI、Subagent 路由与 Web 基线的 fork 抽取之后，仍有一些改动落在 `packages/core`、`packages/sandbox`，以及共享 sandbox 升级路径的 shell 工具等上游包内。把产品策略留在这些文件里，会让每一次上游合并都永久变宽。若不加替代就删掉剩余改动，要么会让子路由失去创建时推理强度，要么会恢复一种阻止模型正常用工具的 sandbox 失败模式。

## Decision

在上游 core／共享代码上只保留两条通用 fork 基础设施补丁。其余相对官方树的产品工具、目录、UI 或组合差异，归插件、fork Profile Bundle，或拥有 harvest 条目的包——不属于这些共享文件。

### 1. `AgentOptions.reasoningEffort` 与首次请求种子

`AgentOptions` 在 `provider`／`model`／`maxTokens` 旁携带可选的 `reasoningEffort`。循环仅在该循环实例的首次提议上写入种子（`seedEffort = 同路由已记录强度 ?? options.reasoningEffort`），且发生在 `agent/request` 之前；该实例记录 header 之后，后续提议遵循已记录配置。请求重建 invariant 会把派出的 `reasoningEffort` 与折叠后的 `request/header` 比较，静默漂移会失败关闭。

这是创建时路由基础设施，不是产品默认值。选择子 LLM 路由的父方（由 Subagent 分支拥有）把选定强度写入 `AgentOptions`；Host 创建／恢复路径可以省略它。模型可见的强度仍只在 `prepareCall` 之后通过已记录 header 出现。

### 2. 非加宽 sandbox 升级按省略处理

当请求模式并非严格更宽时，`approveEscalation` 返回有效模式且永不提示。真正更宽的请求仍须在执行前审批。`bash`、`pwsh` 与文件系统变更工具共享该助手。理由与测试见[非加宽按省略](../bug-fix/2026-08-24-non-widening-sandbox-omit.zh.md)；本笔记只把它归类为不可再减的共享执行，而非产品策略。

## Alternatives considered

**仅通过子 agent setup 中的 `agent/request` waterfall 注入创建时强度。** 已拒绝：`maxTokens` 已从 `AgentOptions` 在首次提议上播种；为 effort 另开通道会迫使每个创建方重做同一规则，且 Subagent 路由覆盖仍需要带类型的创建时字段。

**继续让非加宽的 `sandbox_permissions` 失败。** 已拒绝：同级请求是 Codex 风格工具训练出的习惯；失败并不会收紧隔离，却会阻断会话模式已允许的工作。见省略笔记。

**把 `packages/core/tools/tests` 与 `scripts/gen-tool-catalog.ts` 中的工具目录 harvest 列表改动当作 core 基础设施。** 已拒绝：那些差异只跟随 monorepo 里存在哪些 `tool-*` 包。完整性已由 `assertManifestComplete` 以及与产品包（Bundles／Subagent／Web）一并拥有的逐包 harvest 配方保证。

**把 sandbox 省略挪到包装 shell 工具的产品插件。** 已拒绝：隔离与审批顺序必须留在每个强制执行族调用的共享 `approveEscalation` 路径上；包装器可能按工具分叉并削弱失败关闭行为。

## Consequences

上游合并只需重放推理强度种子／invariant 与 sandbox 省略（及其配对 README／测试）。产品目录、Chrome／zeroY／Schedule UI、list-models 组合、Stats 与 workspace-git 不进入 `dsh-base`／`dsh-web-app`，也不进入本不可再减集合。Subagent 路由依赖 agent 包上继续存在 `AgentOptions.reasoningEffort` 字段。

## Testing

`packages/core/agent-loop/tests/request-reconstruction.spec.ts` 在首次请求上播种创建时强度，并在无适配器默认标记的情况下记入日志。`packages/core/agent-loop/tests/invariant.spec.ts` 拒绝与折叠 header 不一致的派出强度。Sandbox 与 shell 包测试按省略笔记固定省略行为。
