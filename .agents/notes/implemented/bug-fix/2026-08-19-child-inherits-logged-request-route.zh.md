# Agent Note: Child agents inherit the parent's logged request route

Status: implemented

[English](2026-08-19-child-inherits-logged-request-route.md) | 中文

## Problem

同进程子 agent 继承提供方／模型，以便与父会话走同一条认证路由。Web 的创建和恢复会把 `AgentOptions` 写成当时的部署默认，之后的按会话选择只记在 `request/header`。若优先用这些 options 而不是日志，每个子 agent 都会打到父会话并未使用的提供方——通常是缺钥或钥无效的默认路由——于是子 agent 立刻以 `AUTH` 失败，父会话却仍能继续跑。

## Decision

`resolveChildAgentOptions()` 分发 `subagent/resolve-child-options`。挂载 `@deepseek-ai/dsh-subagent-route-policy` 时，父会话最新一条 `request/header` 的提供方／模型是 ACTIVE 路由；仅当父会话还没有记过请求时，才回退到创建时的 options。两者都没有时，才使用 `agentDefaultModel`。按子请求给出的 `request.agentOptions` 覆盖仍然生效。未挂载该插件时，基线只保留创建时父级 options。

见[将 subagent 路由策略插件化](../architecture/2026-08-25-pluginize-subagent-route-policy.zh.md)。

## Alternatives considered

**在 UI 选模型时改写 `Agent.options`。** 否决：options 是创建／恢复时的种子，循环已经把已记录的 header 和 `agent/request` 当作实时路由。再写一次 options 只是重复同一事实。

**给每个子 agent 安装 Web 的模型选择监听器。** 否决：子 agent 不走 api-proxy 的创建路径；没有日志的空白子会话仍会读到部署默认。

**当 options 等于当前默认时当作未设置。** 否决：这是在比较两个实时值；默认在父会话创建之后若已改动，或父会话创建时选的正是它现在还想用的路由，都会判错。

## Consequences

创建后改过模型的 Web 父会话会按已记录路由委派，子 agent 因此使用与父会话相同的凭据。从未发过请求的父会话仍把创建时的 options 交给子 agent。继承不再把宿主写入的 option 当成用户的显式选择。

## Testing

`packages/subagent/subagent-route-policy/tests/child-options.spec.ts` 断言：父会话 options 指向过期默认、日志指向另一条路由时，子 agent 落在日志中的路由上。
