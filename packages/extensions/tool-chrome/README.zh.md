# @deepseek-ai/dsh-tool-chrome

[English](README.md) | 中文

通过本地桥和浏览器扩展，从 DeepSeek Harness 控制一个已登录的真实 Chrome 配置。

## 概览

本插件让 DSH agent 通过 27 个原子 `chrome_*` 工具加上 `chrome_status`，驱动用户现有的 Chrome（含登录态、cookie 和会话）。本地 Chrome 桥是 DSH 原生实现，没有外部运行时。

```
┌────────────────────────────────────────────────┐
│ DSH (this plugin)                              │
│  27 × chrome_* tools + chrome_status            │
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
| `src/bridge/broker.ts` | 基于 Promise 的命令邮箱 | Owner 发送 / connector 轮询 / 完成 |
| `src/bridge/owner-client.ts` | 异步 owner 客户端 | 握手与已认证命令转发 |
| `src/protocol/*` | 纯 TS + JSON | 桥契约、HMAC 证明、协议指纹 |
| `src/protocol/operations.ts` | 27 个工具描述符 | 模型看到的名称与描述 |
| Chrome 扩展 | `assets/browser-extension/` | 下载 zip 时替换为本插件的桥端口 |

## 设置

### 1. 加载 Chrome 扩展

从 Chrome 设置卡片下载扩展 zip（会把本插件的桥端口写入 `assets/browser-extension/`），或在完成同样替换后加载该目录。

然后在 Chrome 打开 `chrome://extensions`，启用开发者模式，并 **加载已解压的扩展程序** 指向解压后的目录。

### 2. 配置 owner 凭据

桥通过共享密钥把 DSH 认证为 owner。把它存进 DSH credentials：

```yaml
# $DSH_HOME/.credentials.yaml
DSH_CHROME_OWNER_CREDENTIAL: "<64-hex-char secret>"
```

或设置环境变量 `DSH_CHROME_OWNER_CREDENTIAL`。

该名字为空时，插件还会从凭据库、再到进程环境读取 `PI_CHROME_OWNER_CREDENTIAL`，并在凭据库接受写入时把找到的密钥存到 `DSH_CHROME_OWNER_CREDENTIAL`。进程会钉死第一把非空密钥作为桥的 HMAC 密钥；之后改凭据库不会轮换已在听的桥。

同一密钥必须与扩展的期望一致。协议指纹默认取自打包的 `evidence.json` 钉死值，因此捆绑扩展可以直接用。若你用不同协议重建，通过 config 覆盖。

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
| `chrome_automation_status` / `chrome_automation_clear_stale` | 查看会话所有权；仅清除已证明过期的记录（从不关闭或接管标签） |
| `chrome_tab_list` / `new` / `activate` / `close` / `group` / `ungroup` | 标签管理 |
| `chrome_snapshot` | 页面 Action Graph，动作为新的 refs |
| `chrome_read` / `inspect` | 读取渲染内容、检查元素 |
| `chrome_navigate` / `evaluate` / `wait` / `console` / `network_list` / `network_get` | 页面控制 |
| `chrome_screenshot` | 视口或整页分块截图 |
| `chrome_click` / `type` / `fill` / `press` / `hover` / `drag` / `tap` / `scroll` / `upload` | 真实 Chrome 输入 |

## 设计

- **普通 Node HTTP**：桥是 `node:http` + Promise；唯一的加密依赖是 `node:crypto`。
- **DSH 原生生命周期**：桥在插件 `apply()` 里启动，在 fiber 释放时停止。
- **凭据走 `ctx.credentials`**：owner 密钥从不出现在代码或日志里。
- **协议兼容**：指纹是版本标签；在 config 里设置 `protocolFingerprint` 声明本桥所说的扩展协议版本（默认是打包的 `evidence.json` 钉死值，当前为 `5cdf33d5…`）。wire call 的 nested↔flat 或参数形态变化会重算哈希；旧扩展在重新加载当前包之前会失败关闭。

## 模型体验

### 工具 schema

#### 模型看到什么

生成的 [`chrome_status` 与 `chrome_*` schema](../../../docs/tool-catalog.zh.md#deepseek-aidsh-tool-chrome)。描述和 JSON 参数以目录正文为准；本包不额外添加系统提示词段落。

#### Token 影响

插件挂载期间，每个已注册工具 schema 都出现在每次请求里。没有按工具开关的 config。

#### KV Cache 影响

插件保持挂载时前缀稳定。加载或卸载插件会改变工具前缀。

## 已知局限与延后工作

- **桥需要真实 Chrome 配置** — 没有已加载的扩展时，`chrome_status` 报 `waiting-for-extension` 或 `offline` 之后，每个 `chrome_*` 调用都会失败。
- **指纹变化后需重载打包扩展** — `assets/browser-extension/evidence.json` 是随包钉死值；更新本包后，移除旧的解压/安装并加载当前 zip，使连接器握手与宿主一致。过期构建会以协议指纹不匹配失败关闭。
- **绑定槽只属于当前在线的连接器** — 之后用新 `connectorId` 握手会替换上一个身份。`chrome_status` 和 `chrome_*` 都只打到当前持有轮询租约的连接器。
- **存储缺失时 owner 凭据生成只在进程内** — 从未写入 `ctx.credentials` 的生成密钥不能跨重启存活。已在听的桥会一直使用第一次解析到的密钥，直到进程退出。
- **页面命令约束 debugger attach 和注入脚本** — attach 有 5s 截止；`chrome.scripting.executeScript` 有 8s 截止。`chrome_tab_new` 或 `chrome_navigate` 之后优先 `chrome_read`，不要靠站点选择器等待首屏。
- **可恢复 command id 的非法 poll 体会立即拒绝** — 扩展投递 `CommandRejected` / `poll-response-invalid` 与有界无密钥诊断；无法恢复 id 时仍回退到邮箱超时。
- **截图写入进程 cwd** — 工具结果指向这些文件；它们不是会话日志附件。
