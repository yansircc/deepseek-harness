# @deepseek-ai/dsh-tool-zeroy

[English](README.md) | 中文

DeepSeek Harness 里面向模型的 zeroY WordPress 站点管理工具。

## 概览

本插件让 DSH Agent 通过 zeroY Connector API 管理远程 WordPress 站点。它暴露五个工具：

| 工具 | 说明 |
|------|-------------|
| `zeroy_inspect` | 读取类型化的 Connector 资源（sites、refs、commits、releases、proofs、integrity、external checks） |
| `zeroy_checkout` | 把远程 SiteCommit 物化为本地 Git 工作树 |
| `zeroy_push` | 上传对象、创建不可变 commit，并创建仅管理员可见的 PreviewRelease |
| `zeroy_pair` | 通过两步绑定流程绑定一个 WordPress 站点 |
| `zeroy_unpair` | 解绑 WordPress 站点并吊销其授权 |

## 架构

```
Agent → zeroy_* tools → Connector REST API → WordPress + zeroY Plugin
                ↕
    ctx.credentials (grant secrets)
    ctx.settings    (site metadata)
```

- **密钥** 存在 `$DSH_HOME/.credentials.yaml`，经由 `@deepseek-ai/dsh-credentials-local`
- **站点元数据** 存在 DSH settings 的 `zeroy-sites` 命名空间
- **文件字节从不进入工具参数** — Agent 用普通文件工具编辑本地 checkout
- **Push 从不激活公开站点** — 只有管理员能发布已具备 proof 的 PreviewRelease

## 配置

```yaml
# cordis.yml
- id: tool-zeroy
  name: '@deepseek-ai/dsh-tool-zeroy'
  config:
    inspect: true      # register zeroy_inspect (default: true)
    checkout: true     # register zeroy_checkout (default: true)
    push: true         # register zeroy_push (default: true)
    pairing: true      # register zeroy_pair + zeroy_unpair (default: true)
```

## 绑定站点

### 交互（由 Agent 驱动）

1. Agent 调用 `zeroy_pair({ endpoint: "https://example.com", label: "My Site" })`
2. 工具返回 `intentId` 和说明
3. 用户在 WP 后台 → zeroY Connections 页面创建配对码
4. Agent 调用 `zeroy_pair({ endpoint, label, intentId, code: "ABC123" })`
5. grant 密钥被安全存储；站点元数据被持久化

### 无头 / CI

设置环境变量：

```bash
ZEROY_SITES='[{"siteId":"my-site","label":"My Site","endpoint":"https://example.com","connectionKey":"legacy-key"}]'
```

或预先写入 `$DSH_HOME/.credentials.yaml`：

```yaml
ZEROY_SITE_MY_SITE: "grant-secret-value"
```

## 多站点

支持多个站点。每个站点有自己的凭据引用和元数据条目。工具按 `siteId` 路由：

```
zeroy_inspect({ resource: "sites" })                    → list all bound sites
zeroy_inspect({ siteId: "site-a", resource: "current" }) → inspect specific site
zeroy_checkout({ siteId: "site-b", source: "active-release" }) → checkout site B
```

## Checkout 布局

```
.zeroy-checkouts/<label>-<checkoutId>/
├── site.json
├── artifacts/theme/
├── artifacts/site-logic/
├── content/posts/<collection>/<ref>.json
├── content/terms/<taxonomy>/<ref>.json
├── locales/<locale>/...
├── media/
└── .zeroy/              ← derived projection (read-only)
    ├── checkout.json
    ├── README.md
    ├── brief.json
    └── review.json
```

## 依赖

- `@deepseek-ai/dsh-credentials` — 凭据解析缝
- `@deepseek-ai/dsh-settings` — 站点元数据持久化
- `@sinclair/typebox` — 输入 schema 校验（沿用原 zeroY）
- Node.js 内置：`fs/promises`、`child_process`、`crypto`、`path`

## 来源

从 [pipee zeroY extension](https://github.com/yansircc/pipee/tree/main/extensions/zeroy) 移植。领域逻辑（对象哈希、合并、浏览器校验）保留；Pi/Effect-TS 适配层换成 DSH 原生 async/await。

## 模型体验

### 工具 schema

#### 模型看到什么

生成的 [`zeroy_inspect`、`zeroy_checkout`、`zeroy_push`、`zeroy_pair` 与 `zeroy_unpair` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-zeroy)。config 开关 `inspect`、`checkout`、`push` 和 `pairing` 在加载时省略对应工具；pairing 同时覆盖 `zeroy_pair` 和 `zeroy_unpair`。

#### Token 影响

每个 config 启用的工具 schema 都出现在每次请求里。切换开关会增加或移除该 schema。

#### KV Cache 影响

已启用工具集合不变时前缀稳定。翻转 config 开关或卸载插件会改变工具前缀。

## 已知局限与延后工作

- **Push 从不激活公开站点** — 只有管理员能在 WordPress 里发布已具备 proof 的 PreviewRelease。
- **文件字节从不进入工具参数** — agent 用普通文件工具编辑本地 checkout，然后 `zeroy_push` 读取该树。
- **浏览器绑定需要 Host web server** — 没有它时，只剩下两步的 `zeroy_pair` 工具流程。
