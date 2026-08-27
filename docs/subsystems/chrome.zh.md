# Chrome

[English](chrome.md) | 中文

Chrome capability 通过 `ctx.chrome` 提供限定 owner 的浏览器自动化。Service Definition 接受 initiating Agent 与 AbortSignal；local Provider 拥有认证 connector transport、browser-session target lease、command settlement 与 extension health。`tool-chrome` 拥有面向模型的 schema 与结果呈现。

隐式 Page 和 Input 操作采用当前 focused regular window 的 active ordinary tab 作为 session lease。只有 `chrome_tab_new` 创建 DSH-owned tab。Cleanup 释放 adopted lease 而不关闭用户 tab，并可关闭 created tab。一个 session 存在多个 target 时必须提供显式 selector。

Manifest V3 extension 执行页面观察与真实输入。Snapshot、read 与 inspect 共用一个 observation runtime，同时保留独立的模型工具。Host 与 extension wire message 由 Chrome protocol package 派生；Host runtime 不依赖 Effect。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxchrome--chromeruntime"></a>

### `ctx.chrome` — `ChromeRuntime`

Owner-scoped registry for one Chrome automation provider.

```ts cordis-catalog
/** Register exactly one started provider and publish it only after startup succeeds.
 * @param provider - Provider to start and publish.
 * @returns Async disposer that reaches provider quiescence.
 */
async registerProvider(provider: ChromeProvider): Promise<() => Promise<void>>

/** Execute one command for an exact initiating Agent.
 * @param owner - Exact initiating Agent.
 * @param command - Provider-neutral Chrome command.
 * @param signal - Required caller cancellation signal.
 * @returns Provider JSON result.
 */
async execute(owner: Agent, command: ChromeCommand, signal: AbortSignal): Promise<ChromeJsonValue>

/** Return a fresh provider health snapshot.
 * @param signal - Optional status cancellation signal.
 * @returns Current provider health.
 */
async status(signal?: AbortSignal): Promise<ChromeHealth>

/** Whether an exact owner has admitted work.
 * @param owner - Exact Agent to inspect.
 * @returns Whether work is admitted for that owner.
 */
hasOwnerActivity(owner: Agent): boolean
```

Types: [Agent](core.zh.md)

Source: [`packages/chrome/chrome/src/index.ts`](../../packages/chrome/chrome/src/index.ts)
<!-- END GENERATED cordis-surface -->
