# Agent Note: Chrome protocol fingerprint completeness and poll-decode diagnostics

Status: implemented

English | [中文](2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.zh.md)

## Problem

The host protocol fingerprint projected `wireCommand.call` as a bare `{type:'object'}`, so nested↔flat or parameter-shape drift did not change `protocolFingerprint()`. Screenshot result selectors still named nested `call.operation.*` paths while the live PageCall was flat. `EXTENSION_PROTOCOL_FINGERPRINT` was a hardcoded override that could disagree with `protocolFingerprint()`, and packaged `evidence.json` was not the single pin authority. An invalid long-poll body failed schema decode without a recoverable fast path, so the host waited for mailbox timeout (`CommandOutcomeUnknown`) even when the command id was present. `readResponseText` interruption cleanup referenced an undefined `reader`.

## Decision

Derive the complete WireCommand / ForwardRequest / PollResponse call unions on the host from atomic tool descriptors plus explicit system wire ops (`version`, `cleanup`, `cleanup-all`, `probe`), including flat `op`, targets, and required/optional fields, with PollResponse embedding WireCommand. Fix screenshot selectors to `call.capture.kind` / `call.format`. Make `assets/browser-extension/evidence.json` the shipped pin; `EXTENSION_PROTOCOL_FINGERPRINT` reads it; service-worker probe/profile literals match; a drift gate asserts computed == evidence == host expectation == bundled literals. In the bundled service worker, format Effect Schema poll decode failures with secret-free field paths and a bounded summary `{type, command:{id/domain/call.op}}` (≤2KB). When `type:'command'` and id are recoverable, post `CommandRejected` with code `poll-response-invalid`; otherwise log and retry, leaving mailbox timeout as fallback. Cancel `response.body` on `readResponseText` interrupt. Keep flat PageCall/InputCall and system `clear-stale` (including popup alignment).

This completes the fingerprint follow-up deferred from [Chrome safe stale-ownership recovery](2026-08-23-chrome-safe-stale-ownership-recovery.md).

## Alternatives considered

**Keep the hardcoded host override equal to old evidence while leaving call projection coarse.** Rejected: the pin lied about contract coverage and allowed silent nested↔flat drift.

**Require the extension to recompute the host hash at runtime for handshake.** Rejected: the packaged pin plus drift gate already binds host and shipped assets; recomputation would still need a pin for old builds to fail closed.

**Always fail the poll fiber without posting when decode fails.** Rejected: a recoverable id must release the host mailbox immediately.

## Consequences

Old extensions with the previous fingerprint fail closed until reloaded from the current package. Invalid poll commands with recoverable ids surface `poll-response-invalid` to the host/model instead of a 30s unknown outcome. Maintainers must update `evidence.json` and bundled literals together when the wire call contract changes.

## Testing

`tests/protocol-fingerprint.spec.ts` asserts pin alignment and that call unions are complete / nest-sensitive. `tests/poll-diagnostics.spec.ts` covers field paths, secret redaction, length bound, and rejection shape. `tests/bundled-service-worker-wire-schema.spec.ts` gates flat PageCall/InputCall (SW + popup), clear-stale, poll-decode helpers, and `readResponseText` body cancel. Focused vitest under `packages/extensions/tool-chrome/tests` plus `node --check` on `service-worker.js` and `popup.js`.
