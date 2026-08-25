# @deepseek-ai/dsh-tool-chrome

[English](README.md) | 中文

`ctx.chrome` 能力的模型工具 Consumer。它注册 27 个原子 `chrome_*` 命令和 `chrome_status`，把已验证的工具参数投影到共享的闭合协议联合，要求存在发起 Agent，并把工具的同一个取消信号传给 Chrome provider。

本包拥有模型 schema、描述、参数兼容投影与 JSON 展示；不拥有桥接 socket、凭据、连接器租约、扩展产物、Web 路由或设置。

## Model Experience

### Tool schemas

模型会看到 `chrome_status` 与 27 个标签页、页面、输入、截图、网络和自动化所有权原子工具。本包不增加 system prompt 段落。

### Token effect

挂载期间，每次请求都包含所有 Chrome 工具 schema；没有逐工具开关。

### KV Cache effect

Consumer 保持挂载时，工具前缀稳定。provider 重连与 operation revision 不改变模型 schema。

## Known Limitations and Deferred Work

截图结果暂时保留为 provider 返回的有界 JSON。工作区二进制产物持久化需要二进制写入文件系统或附件 Consumer；本包不会绕过 `ctx.fs` 使用环境 Node 文件系统。
