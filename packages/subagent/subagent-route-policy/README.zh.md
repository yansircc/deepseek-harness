# @deepseek-ai/dsh-subagent-route-policy

[English](README.md) | 中文

拥有进程内 subagent 子级的 fork LLM 路由策略：已记录的 ACTIVE 路由继承、`agentDefaultModel` 回退、路由变更时丢弃推理强度，以及可选的 `ctx.subagentRoute` 服务——模型可见的委派 Consumer 用它做每次调用的 `provider`／`model`／`reasoning_effort` schema 与目录校验。

## 角色

未挂载本插件时，`resolveChildAgentOptions` 只保留创建时父级 options 与请求覆盖，且 `dsh-tool-subagent` 不暴露路由字段。在 `dsh-subagent` 旁挂载后，每次进程内子级创建都会走 ACTIVE 路由 waterfall；绑定进程内传输的每个 `dsh-tool-subagent` 实例会获得路由参数与校验。

产品传输仍省略这些字段：提供方缺少 `persona` 与 `toolFilter` 时，`ctx.subagentRoute.honors` 为 false。

## 组合

在 `@deepseek-ai/dsh-subagent` 之后、进程内 provider 与 `dsh-tool-subagent` 行之前加载。随附的 base bundle 与 ACP 示例包含该行。

## 测试

`tests/child-options.spec.ts` 固定已记录路由优先、强度继承与丢弃，以及默认模型回退。`tests/delegation-route.spec.ts` 固定空白即省略、目录校验，以及对产品传输的拒绝。

## 模型体验

### 父级委派 schema 字段

#### 模型看到的内容

挂载本插件且绑定的传输支持 LLM 路由时，每个 `dsh-tool-subagent` 实例会获得生成的 [`subagent` schema](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-subagent) 上记录的可选 `provider`、`model`、`reasoning_effort` 字段，以及指向 `list_models` 的描述后缀。产品传输会省略这些字段。

#### Token 影响

仅在插件已挂载且传输支持路由时产生固定 schema 成本；省略本插件会去掉这三个参数与描述后缀。

#### KV Cache 影响

对给定组合前缀稳定；挂载或移除本插件，或在进程内传输与产品传输之间切换，会改变父级工具定义。

### 子 agent 请求路由

#### 模型看到的内容

经 `resolveChildAgentOptions` 创建的进程内子级会继承父会话最新记录的 `request/header` 提供方／模型，并在路由未变时继承推理强度。仅当尚无 header 时才使用创建时 options；`agentDefaultModel` 为最后手段。父级工具的每次调用覆盖仍然生效。

#### Token 影响

不增加父级 schema token；子级请求按策略所选的提供方／模型计费。

#### KV Cache 影响

与父级请求缓存无关。继承或覆盖后的不同提供方／模型会建立不同的子级前缀。

## 已知限制与延后工作

- **未挂载插件时仅创建时继承** — 省略本行的组合不会继承已记录的 UI 模型选择，也不会在 `dsh-tool-subagent` 上暴露每次调用的路由字段。
- **产品传输永不兑现路由字段** — 缺少 `persona` 与 `toolFilter` 的提供方保持 schema 关闭；显式路由参数在执行时被拒绝。
