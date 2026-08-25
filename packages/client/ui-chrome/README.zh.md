# @deepseek-ai/dsh-client-ui-chrome

[English](README.md) | 中文

Chrome 桥的浏览器设置卡片。它占用共享的 `settings.plugin.item` 槽，键为 `tool-chrome` 命名空间：展示就绪状态、扩展下载和高级端口字段。Host 插件 [`@deepseek-ai/dsh-tool-chrome`](../../extensions/tool-chrome/README.zh.md) 拥有桥、owner 凭据以及全部面向模型的 `chrome_*` 工具。

```yaml
- id: ui-chrome
  name: '@deepseek-ai/dsh-client-ui-chrome'
```

## 模型体验

无，因为卡片只改 Host 设置，不触碰任何提示词、消息、schema、流或工具结果。

#### KV Cache 影响

无；本包从不组装或发送提供方请求。

## 已知局限与延后工作

- **卡片不会启动 Chrome** — 它报告桥状态并提供扩展 zip；操作者仍须在真实 Chrome 配置里加载未打包扩展。
- **端口更改在下次 Host 重启后生效** — 正在运行的桥保持它启动时的监听端口。
