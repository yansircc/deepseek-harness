# @deepseek-ai/dsh-tool-chrome

[English](README.md) | 中文

通过本地桥和浏览器扩展，从 DeepSeek Harness 控制一个已登录的真实 Chrome 配置。

## 概览

本插件让 DSH agent 通过 25 个原子 `chrome_*` 工具加上 `chrome_status`，驱动用户现有的 Chrome（含登录态、cookie 和会话）。它在 DSH 内原生实现 pi-chrome 桥协议 — 不用 Effect，也没有外部运行时。

```
┌────────────────────────────────────────────────┐
│ DSH (this plugin)                              │
│  25 × chrome_* tools + chrome_status            │
│  BridgeServer (node:http, owner auth via HMAC)  │
└──────────────┬─────────────────────────────────┘
               │ localhost HTTP (default 17318)
┌──────────────▼─────────────────────────────────┐
│ Chrome Extension (load unpacked)               │
│  chrome.debugger API → real browser            │
└────────────────────────────────────────────────┘
```

## 架构

| 部分 | 实现 | 说明 |
|-------|---------------|-------|
| `src/bridge/server.ts` | `node:http` 服务器 | Owner（DSH）与 connector（扩展）路由，HMAC 认证 |
| `src/bridge/broker.ts` | 基于 Promise 的命令邮箱 | 移植自 pi-chrome `CommandBroker` |
| `src/bridge/owner-client.ts` | 异步 owner 客户端 | 握手与已认证命令转发 |
| `src/protocol/*` | 纯 TS + JSON | 桥契约、HMAC 证明、协议指纹 |
| `src/protocol/operations.ts` | 25 个工具描述符 | 名称与描述与 pi-chrome 相同 |
| Chrome 扩展 | 来自 pi-chrome 的预构建 | 用指向本插件端口的 `--bridge-url` 重建 |

## 设置

### 1. 加载 Chrome 扩展

从 [pipee chrome extension](https://github.com/yansircc/pipee/tree/main/extensions/chrome) 构建浏览器扩展，并把桥 URL 设为本插件的端口：

```bash
cd extensions/chrome
node scripts/build.ts --bridge-url http://127.0.0.1:17318 --out-dir "$(mktemp -d)"
```

然后在 Chrome 打开 `chrome://extensions`，启用开发者模式，并 **加载已解压的扩展程序** 指向该构建目录。

### 2. 配置 owner 凭据

桥通过共享密钥把 DSH 认证为 owner。把它存进 DSH credentials：

```yaml
# $DSH_HOME/.credentials.yaml
PI_CHROME_OWNER_CREDENTIAL: "<64-hex-char secret>"
```

或设置环境变量 `PI_CHROME_OWNER_CREDENTIAL`。

同一密钥必须与扩展的期望一致；协议指纹默认是 pi-chrome 协议 v1 指纹，因此预构建扩展可以直接用。若你用不同协议重建，通过 config 覆盖。

### 3. 注册插件

```yaml
# cordis.yml
- id: tool-chrome
  name: '@deepseek-ai/dsh-tool-chrome'
  config:
    port: 17318          # must match the extension's --bridge-url port
    commandTimeoutMs: 30000
```

## 工具

| 工具 | 用途 |
|------|---------|
| `chrome_status` | 桥与扩展状态（ready / waiting-for-extension / offline） |
| `chrome_tab_list` / `new` / `activate` / `close` / `group` / `ungroup` | 标签管理 |
| `chrome_snapshot` | 页面 Action Graph，动作为新的 refs |
| `chrome_read` / `inspect` | 读取渲染内容、检查元素 |
| `chrome_navigate` / `evaluate` / `wait` / `console` / `network_list` / `network_get` | 页面控制 |
| `chrome_screenshot` | 视口或整页分块截图 |
| `chrome_click` / `type` / `fill` / `press` / `hover` / `drag` / `tap` / `scroll` / `upload` | 真实 Chrome 输入 |

## 设计

- **零 Effect**：桥是普通 `node:http` + Promise；唯一的加密依赖是 `node:crypto`。
- **DSH 原生生命周期**：桥在插件 `apply()` 里启动，在 fiber 释放时停止。
- **凭据走 `ctx.credentials`**：owner 密钥从不出现在代码或日志里。
- **协议兼容**：指纹是版本标签；在 config 里设置 `protocolFingerprint` 声明本桥所说的扩展协议版本（默认是 pi-chrome v1 指纹 `75eedfbc…`）。

## 模型体验

### 工具 schema

#### 模型看到什么

生成的 [`chrome_status` 与 `chrome_*` schema](../../../docs/tool-catalog.md#deepseek-aidsh-tool-chrome)。描述和 JSON 参数以目录正文为准；本包不额外添加系统提示词段落。

#### Token 影响

插件挂载期间，每个已注册工具 schema 都出现在每次请求里。没有按工具开关的 config。

#### KV Cache 影响

插件保持挂载时前缀稳定。加载或卸载插件会改变工具前缀。

## 已知局限与延后工作

- **桥需要真实 Chrome 配置** — 没有已加载的扩展时，`chrome_status` 报 `waiting-for-extension` 或 `offline` 之后，每个 `chrome_*` 调用都会失败。
- **存储缺失时 owner 凭据生成只在进程内** — 从未写入 `ctx.credentials` 的生成密钥不能跨重启存活。
- **截图写入进程 cwd** — 工具结果指向这些文件；它们不是会话日志附件。
