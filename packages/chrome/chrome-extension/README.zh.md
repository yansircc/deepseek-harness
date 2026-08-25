# @deepseek-ai/dsh-chrome-extension

[English](README.md) | 中文

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

None, as this is a build-only browser artifact package and it registers no model-facing tool or prompt section.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- Kernel or manifest changes still require one safe MV3 extension reload; operation-only development uses `pnpm run dev:chrome` revisions.
