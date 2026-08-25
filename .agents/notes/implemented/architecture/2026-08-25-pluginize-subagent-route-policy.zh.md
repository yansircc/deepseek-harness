# Agent Note: 将 subagent 路由策略插件化

Status: implemented

[English](2026-08-25-pluginize-subagent-route-policy.md) | 中文

## Problem

已记录 ACTIVE 路由继承、`agentDefaultModel` 回退、路由变更时丢弃推理强度，以及每次调用的 provider／model／effort 校验，原先写在上游共享的 `dsh-subagent` 与 `dsh-tool-subagent` 实现文件里。这些是 fork 产品策略；留在共享 Service Definition 与基础 Consumer 中，会迫使每次上游合并都重新争论路由归属，也无法在没有 fork 规则的情况下挂载纯创建时继承。

## Decision

`dsh-subagent` 拥有最小通用解析 seam：`baselineChildAgentOptions` 是创建时父级 options 加请求覆盖，`resolveChildAgentOptions` 以该基线为 `next()` 运行 `subagent/resolve-child-options` waterfall。可选的 `SubagentRoute` 类型描述每次调用的 schema 与校验，但不要求必须有提供方。

`@deepseek-ai/dsh-subagent-route-policy` 是 fork 插件。它短路 waterfall，实现已记录 ACTIVE 路由继承、默认模型回退与路由变更时的强度策略，并提供面向模型 Consumer 的 `ctx.subagentRoute`。`dsh-tool-subagent` 机会性地读取该服务：缺席时无路由字段且配置 `agentOptions` 原样传递；存在时进程内传输获得路由参数与目录校验。组合在 `dsh-subagent` 旁挂载该策略。

本切片不需要独立的带路由委派 Consumer：路由 schema 文案与校验已迁入策略包，现有 Consumer 仍是唯一模型可见注册点，仅保留一层可选服务钩子。

## Alternatives considered

**继续把路由策略留在 `resolveChildAgentOptions` 与 `tool-subagent/route.ts`。** 未采纳：会把 fork 产品规则嵌进上游共享文件，并且在不每次合并时分叉这些模块的情况下，无法使用仅创建时继承。

**用独立的带路由 Consumer 包替换 `dsh-tool-subagent`。** 本切片未采纳：为搬迁已被可选 `ctx.subagentRoute` 服务拥有的 schema 文案，会重复整套工具注册表面。仅当某部署必须在不加载基础包的情况下挂载带路由 Consumer 时再考虑。

**在 UI 选模型时改写 `Agent.options`。** 仍未采纳；见[子级继承已记录请求路由](../bug-fix/2026-08-19-child-inherits-logged-request-route.zh.md)。

## Consequences

获得：上游共享的子级解析保持创建时继承；fork 路由策略是一个可加载插件；挂载策略时模型可见 schema 保持字节稳定；普通组合可省略该插件。

代价：多一行组合；期望路由字段的目录与工具测试必须挂载策略；`ctx.get('subagentRoute')` 是 Consumer 钩子。

## Testing

`packages/subagent/subagent-route-policy/tests/child-options.spec.ts` 与 `delegation-route.spec.ts` 拥有 fork 策略。`subagent-in-process-driver.spec.ts` 在无监听器时固定创建时继承基线。`tool-subagent.spec.ts` 为 schema 与执行覆盖挂载策略。随附 base 与 ACP 组合加载 `@deepseek-ai/dsh-subagent-route-policy`。
