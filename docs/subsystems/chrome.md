# Chrome

English | [中文](chrome.zh.md)

The Chrome capability exposes owner-scoped browser automation through `ctx.chrome`. The Service Definition accepts an initiating Agent and AbortSignal; the local Provider owns authenticated connector transport, browser-session target leases, command settlement, and extension health. `tool-chrome` owns model-facing schemas and result presentation.

Implicit Page and Input operations adopt the active ordinary tab in the focused regular window as a session lease. Only `chrome_tab_new` creates a DSH-owned tab. Cleanup releases adopted leases without closing user tabs and may close created tabs. Multiple session targets require an explicit selector.

The Manifest V3 extension executes page observation and real input. Snapshot, read, and inspect share one observation runtime while retaining separate model tools. Host and extension wire messages derive from the Chrome protocol package; the Host runtime has no Effect dependency.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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

Types: [Agent](core.md)

Source: [`packages/chrome/chrome/src/index.ts`](../../packages/chrome/chrome/src/index.ts)
<!-- END GENERATED cordis-surface -->
