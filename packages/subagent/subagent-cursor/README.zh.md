# @deepseek-ai/dsh-subagent-cursor

[English](README.md) | 中文

面向 [subagent seam](../subagent/README.zh.md) 的一等公民 Cursor 子代理后端。与通用 ACP provider 不同，它按模型各保持一个常驻 `agent acp` 服务器，每次委派在池化连接上开一个 ACP 会话——重复的小任务完全跳过逐次拉进程的冷启动。权限策略从二元的 allow/reject 升级为按 ACP 工具类型判定的三档策略，并且支持按模型分池路由子代理模型。

## 启动与所有权

`start(request)` 只接受非空文本块序列，并从父会话（或部署 `cwd` 覆盖）解析子代理会话工作目录。随后从池中借一条连接（仅当池为空时才新拉起 `agent [--model <model>] acp` 子进程），每个进程只做一次 ACP `initialize` 握手，直到 `session/new` 返回合法会话 id 才发布 run。发布前的失败或取消会释放池化连接并 reject `start()`——进程保持温热。

已发布的 `run.result` 在本次会话上恰好执行一轮。助手文本按会话过滤后汇入共享结果折叠（复用连接的旧会话迟到更新不会污染当前轮次）；权限请求按配置策略自动应答；`end_turn`/`max_tokens`/`refusal`/`cancelled` 等终止原因映射到 harness 词汇表。发布后的传输失败以 `error` 结束，**并驱逐该连接**——垂死的线缆绝不会交给下一次委派。

`dispose()` 幂等：取消本轮（尽力而为的 ACP `session/cancel`），等待结果（其终结路径会把连接放回池中并尽力 `session/close`），绝不拆池化进程。空闲连接在 `idleTtlMs` 后经共享进程树升级流程回收；插件卸载时池会关闭全部连接（`ctx.effect`）。

## 能力与上下文

provider 不声明任何可选的启动期能力，`inheritsParentContext: false`。子代理只收到独立的任务文本与自己的会话工作目录，不继承父对话、persona、工具过滤、深度策略或结构化输出契约。可续聊子代理仍是 seam 层工作（见 [subagent seam 的已知限制](../subagent/README.zh.md)）。

## 配置

| 键 | 默认 | 含义 |
|---|---|---|
| `providerName` | `cursor` | `ctx.subagents` 上的非空注册名；每个挂载实例必须唯一。 |
| `command` | 必填 | Cursor agent 可执行文件（如 `agent`）。 |
| `model` | — | 可选模型键。缺省 → 子代理用 Cursor 自带模型；指定 → 按模型分池并启动 `--model <model> acp`，一个 provider 可服务多个模型。 |
| `args` | `[]` | 放在 `acp` 之前的额外参数（如 `--trust`）。 |
| `permission` | `deny` | `session/request_permission` 的自动应答策略：`deny` 拒绝一切；`allowEdits` 只放行 `allowEditsKinds` 中的类型；`allow` 选第一个 `allow_once`/`allow_always` 选项。不会把提示转给真人。 |
| `allowEditsKinds` | `['edit', 'delete', 'move']` | `allowEdits` 下放行的 ACP 工具类型（线上 `ToolKind` 联合）。 |
| `poolSize` | `2` | 每模型最大并发连接数（即并发 Cursor run 数）。每条连接同时只有一个活跃 ACP 会话。 |
| `idleTtlMs` | `30_000` | 释放后空闲多久关闭回收该连接。 |
| `initTimeoutMs` | `30_000` | 每条连接 `initialize` 握手的时间上限。 |
| `cwd` | — | 池进程与各会话的工作目录覆盖。缺省 → 进程跑在 harness 启动目录，而每次委派的**会话**继承父会话 cwd。 |
| `env` | `{}` | 叠加在子进程 seam 清洗后的父环境之上的额外子环境。 |
| `disposeEofGraceMs` | `6_000` | 关闭时 EOF 静默窗口，之后才 SIGTERM→SIGKILL。 |
| `disposeGraceMs` | `3_000` | 关闭时 SIGTERM 与 SIGKILL 之间的 POSIX 宽限。 |

```yaml
- id: subagent-cursor
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor
    command: /Users/you/.local/bin/agent
    args: ['--trust']
    permission: allowEdits
    poolSize: 2
    env:
      HTTPS_PROXY: 'http://127.0.0.1:2080'
      HTTP_PROXY: 'http://127.0.0.1:2080'
      ALL_PROXY: 'socks5://127.0.0.1:2080'
```

该包是可选 Profile Bundle。装进目标 Profile 后重启该 Profile；`cordis.patch.yml` 只注册休眠的 `cursor` Host provider，不拉起 Cursor 进程。卸包后下次启动撤回该 provider。

```sh
dsh plugin --profile <name> add @deepseek-ai/dsh-subagent-cursor
dsh plugin --profile <name> remove @deepseek-ai/dsh-subagent-cursor
dsh --profile <name>
```

安装只决定 Host 上有没有这个 provider，不决定模型能不能调用。Bundle 给出默认休眠的 `cursor` 行；Profile 可以整行替换 config，或再挂 `providerName` / `permission` / `env` 不同的实例。加载实例不会启动进程，直到有绑定工具调用它。每个 `dsh-tool-subagent` 行对应一个 provider，且需要自己的 `toolName`。完整 Agent Preset 若带产品工具行，应保持 `disabled: true`，复制一份再打开。

```yaml
- id: tool-subagent-cursor
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor
    toolName: subagent_cursor
    backgroundMode: one-shot
    maxDepth: 3
```

多实例共用同一个包、不同策略：

```yaml
- id: subagent-cursor-safe
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor-safe
    command: /Users/you/.local/bin/agent
    permission: deny

- id: subagent-cursor-edits
  name: '@deepseek-ai/dsh-subagent-cursor'
  config:
    providerName: cursor-edits
    command: /Users/you/.local/bin/agent
    args: ['--trust']
    permission: allowEdits
```

```yaml
- id: tool-subagent-cursor-safe
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor-safe
    toolName: subagent_cursor_safe
    backgroundMode: one-shot
    maxDepth: 3

- id: tool-subagent-cursor-edits
  name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: cursor-edits
    toolName: subagent_cursor_edits
    backgroundMode: one-shot
    maxDepth: 3
```

## 模型体验

### 子代理请求

#### 模型看到什么

Cursor 子代理在一个全新 ACP 会话里收到独立文本块作为一轮任务。工作区是委派会话的 cwd；模型、系统指令、工具与认证来自原生 Cursor 安装与配置（或 `model` 池键）。通过 `dsh-tool-subagent`，前台调用把选定的最终 Cursor 答案（或非完成结果的精确错误）交给父代理。后台调用先返回 Job id；通用 job 控制随后投递完成通知，通过 `job_output` 暴露最终答案与状态，`job_kill` 可请求取消。Cursor 的推理、工具活动、stderr 与产品 id 不进入父会话。

#### Token 影响

子代理为独立的 Cursor 上下文与轮次付费；子代理 token 不进父上下文。

#### KV Cache 影响

与父请求缓存无关；复用仅取决于 Cursor 自身的 provider、模型、指令、工具与会话请求。

## 已知限制与后续工作

- **远程、不可按 trace 枚举** —— ACP run 在父会话语料里没有本地子会话，GUI 看不到子代理内部轮次（与 `dsh-subagent-acp` 同契约）。
- **不支持可续聊** —— 追加 `send_message`、冷恢复与结算通知对远程 provider 是 seam 层工作（见 seam 已知限制）。
- **除 `depthLimit` 外无可选共享能力** —— `outputSchema`、persona、工具过滤会被共享服务拒绝（递归上限按父会话委派深度本地执行）。
- **权限自动应答** —— 子代理的权限提示不会转给真人；`allow`/`allowEdits` 在子进程内等同 yolo。
- **池进程状态共享** —— 常驻 `agent acp` 会累积 Cursor 侧状态；靠逐 run 会话、尽力 `session/close` 与空闲 TTL 缓解。
- **Cursor 会话 id 保持私有** —— 父命名空间的 run id 不等于 Cursor 会话 id；跨工具续接需要 seam 的逐子续接广告。
- **Cursor 编辑器扩展会被确认并丢弃** —— `cursor/update_todos` 以及其它 `cursor/` 客户端方法或通知返回空的 ACP 结果，使子轮次可以继续。载荷不会写入父会话。
