# @deepseek-ai/dsh-client-ui-zeroy

[English](README.md) | 中文

已绑定 zeroY WordPress 站点的浏览器设置卡片。它占用共享的 `settings.plugin.item` 槽，键为 `zeroy-sites` 命名空间，并驱动一键浏览器绑定。Host 插件 [`@deepseek-ai/dsh-tool-zeroy`](../../extensions/tool-zeroy/README.zh.md) 拥有站点凭据、绑定路由以及全部面向模型的 `zeroy_*` 工具。

```yaml
- id: ui-zeroy
  name: '@deepseek-ai/dsh-client-ui-zeroy'
```

## 模型体验

无，因为卡片只改 Host 设置，不触碰任何提示词、消息、schema、流或工具结果。

#### KV Cache 影响

无；本包从不组装或发送提供方请求。

## 已知局限与延后工作

- **绑定需要 Host web server** — 没有它卡片无法完成 OAuth 回调，操作者回退到由工具驱动的 `zeroy_pair` 流程。
- **卡片不会发布站点** — push 只创建管理员可见的预览发布；公开激活仍在 WordPress 里完成。
