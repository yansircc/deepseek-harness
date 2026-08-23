# Agent Note: Chrome safe stale-ownership recovery

Status: implemented

English | [中文](2026-08-23-chrome-safe-stale-ownership-recovery.zh.md)

## Problem

After a browser epoch change or when an owned automation tab disappears, get/create paths threw `automation-ownership-lost` and blocked replacement tabs. Operators and the model had no record-only recovery: `cleanup` / `cleanup-all` close tabs, and nothing auto-cleared proved-safe stale records. A tab that left regular profile windows also needed an explicit recovery path that never adopts another tab.

## Decision

Register system-domain atomic tools `chrome_automation_status` and `chrome_automation_clear_stale`. The bundled service worker adds `clear-stale`, which removes proved-stale ownership records only and never closes or adopts tabs. Before get/create continue, `withTargetTurn` auto-reconciles only `epoch-changed` and `tab-missing`. `tab-outside-regular-profile` is never auto-cleared; ownership errors for that case name `chrome_automation_clear_stale`. The extension popup offers a same-extension recovery button that reports and clears profile-wide stale records without secrets or a destructive cleanup control. Host operation/result/deadline contracts and packaged SW fragments include `clear-stale`. Protocol fingerprint pin alignment is owned by [Chrome protocol fingerprint completeness and poll-decode diagnostics](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md).

## Alternatives considered

**Auto-clear every stale reason on get/create.** Rejected: a tab outside the regular profile is not safe to drop without an explicit operator or model action.

**Reuse `cleanup` for recovery.** Rejected: cleanup closes owned tabs; stale recovery must be record-only.

**Ship fingerprint pin updates in this slice.** Rejected then; completed in [Chrome protocol fingerprint completeness and poll-decode diagnostics](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md).

## Consequences

Epoch and missing-tab ownership no longer block replacement after auto-reconcile. Explicit clear remains required when the recorded tab left regular windows.

## Testing

`packages/extensions/tool-chrome/tests/plugin.spec.ts` expects 27 atomic tools plus `chrome_status`. `automation-stale-recovery.spec.ts` pins system descriptors and host clear-stale contracts. `bundled-service-worker-wire-schema.spec.ts` pins bundled `clear-stale`, auto-reconcile reasons, record-only wording, and popup recovery messages. Focused `vitest` under `packages/extensions/tool-chrome/tests` plus `node --check` on `service-worker.js` and `popup.js`.
