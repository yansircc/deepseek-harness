# Agent Note: Chrome capability seam owns bridge, extension protocol, browser-session ownership, and atomic tool consumers

Status: implemented

[English](2026-08-25-chrome-capability-seam.md) | 中文

## Problem

Chrome automation combined model-facing tools, local bridge, credentials, connector ownership, protocol vocabulary, extension distribution, and Web status routes in one package. The browser extension was a generated artifact without authored source in this repository, while Host and extension operation contracts can drift even when their manually synchronized fingerprint is equal. Cancellation, startup, connector adoption, wire decoding, and disposal lack one capability owner.

## Decision

Chrome is split into a provider-neutral protocol, an owner-scoped `ctx.chrome` Service Definition, a local bridge provider, a model-facing atomic-tool Consumer, and a separate Web/UI Consumer. One canonical operation descriptor source generates model schemas, wire unions, result contracts, extension dispatch, protocol revisions, artifacts, and catalog inputs. The stable kernel protocol covers authentication, transport, journal, cancellation, acknowledgement, and executor envelopes; operation/page-program revisions change without extension reload.

Service Definition 接受精确的 initiating Agent 和必需的 AbortSignal。一个 Provider 在发布前完整启动，拒绝重复或缺失 Provider，记录 command outcome 语义，并在 dispose 时等待 Provider 静止。local Provider 拥有 loopback HTTP/HMAC、credentials、connector lease、browser-session ownership、durable broker、extension artifacts 和有界 runtime decoding。Connector adoption 仅在 challenge-response proof 后提交。model Consumer 拥有 tool names、model schemas、semantic argument normalization、cancellation forwarding 和 presentation。client UI 仅消费无 secret 的 status 与 proof-ready artifact metadata。

隐式 Page 和 Input 操作把当前 focused regular window 的 active ordinary tab 采用为 session lease。只有显式 `chrome_tab_new` 创建 DSH-owned tab。持久 target record 区分 adopted 和 created tab；cleanup 释放 adopted lease 而不关闭用户 tab，只可关闭 created tab。一个 session 有多个 target 时必须提供显式 selector。受保护的 browser 或 extension URL 永不被采用。Extension 不再包含 bootstrap document、allocation nonce、source-URL capture 或 post-creation navigation state。

Existing model-visible tool names and durable session semantics remain stable unless a separate breaking decision is recorded. Chrome remains host-plane because the bridge owns process-singleton browser state; moving tools behind agent presets is a separate decision. Existing Chrome notes remain authoritative for credential pinning, connector lease selection, page deadlines, mailbox recovery, stale ownership, and protocol diagnostics and remain cross-referenced authorities for those invariants.

## Alternatives considered

**Continue patching generated service-worker.js.** Rejected: generated output has no source-of-record or deterministic freshness gate, so source, bundle, evidence, and live extension can drift again.

**Rewrite browser automation without a capability split.** Rejected: Action Graph, real Chrome input, durable journal, safe stale recovery, and may-mutate unknown-outcome semantics are valuable behavior that can move behind a better seam.

**Keep the monolithic package and add more runtime flags.** Rejected: credentials, transport, model schemas, UI routes, and browser execution evolve independently and require separate lifecycle and testing owners.

**Make every operation change require extension reload.** Rejected: tool descriptions, page programs, result projections, and wait observations change frequently during development; a stable kernel plus authenticated dynamic operation revision removes that reload cost without allowing unauthenticated remote code.

## Consequences

The package boundaries and deterministic extension build replace the legacy mixed package. The extension kernel must retain strict authentication, bounded dynamic program execution, durable journal recovery, and fail-closed kernel compatibility. A real built-artifact Chrome smoke lane becomes required in addition to source and bundle tests. Provider-specific HTTP details no longer leak into tools or UI, while headless composition can omit the Web adapter explicitly.

Cross-reference authorities:

- [Chrome owner secret process pin](../../implemented/bug-fix/2026-08-21-chrome-owner-secret-process-pin.zh.md)
- [Chrome live connector slot](../../implemented/bug-fix/2026-08-21-chrome-live-connector-slot.zh.md)
- [Chrome page command deadlines](../../implemented/bug-fix/2026-08-22-chrome-page-command-deadlines.zh.md)
- [Chrome wait mailbox recovery](../../implemented/bug-fix/2026-08-22-chrome-wait-mailbox-wedge.zh.md)
- [Chrome stale ownership recovery](../../implemented/bug-fix/2026-08-23-chrome-safe-stale-ownership-recovery.zh.md)
- [Chrome protocol and poll diagnostics](../../implemented/bug-fix/2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.zh.md)

This decision supersedes no implemented note; the linked security, lifecycle, and recovery records remain active authorities.
