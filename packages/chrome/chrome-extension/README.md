# @deepseek-ai/dsh-chrome-extension

Authored Manifest V3 source and deterministic browser artifacts for the DSH Chrome connector. The package owns the service worker, popup, injected page programs, protocol projection, and `dist/browser-extension`; consumers serve or package that directory without editing generated JavaScript.

## Build

```sh
pnpm --filter @deepseek-ai/dsh-chrome-extension run typecheck
pnpm --filter @deepseek-ai/dsh-chrome-extension run build
pnpm --filter @deepseek-ai/dsh-chrome-extension run check:fresh
```

`build` emits a fixed Chrome 120 IIFE distribution and generated `evidence.json`. `check:fresh` rebuilds into a temporary directory and compares every byte with the committed distribution. Change authored files under `src/`, then rebuild; never edit `dist/` directly.

The kernel protocol, manifest permissions, connector transport, durable command journal, Chrome API executor, and popup require an extension reload when their generated artifact changes. Page-operation code will move behind operation revisions so ordinary automation development does not require a kernel reload.

## Model Experience

This package registers no tools and contributes no model-visible context. `@deepseek-ai/dsh-tool-chrome` owns tool schemas and results.

## Known Limitations and Deferred Work

The initial recovery keeps Effect 4 and Vite Plus/Rolldown pinned to reproduce the imported 0.5.3 artifact behavior. The shared `@deepseek-ai/dsh-chrome-protocol` package will become the sole protocol authority during provider and consumer migration; this package still carries the recovered protocol implementation until that integration lands.
