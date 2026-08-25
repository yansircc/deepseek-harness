# Agent Note: Chrome capability seam owns bridge, extension protocol, browser-session ownership, and atomic tool consumers

Status: proposed

## Problem

Chrome automation currently combines the model-facing tools, local bridge, credentials, connector ownership, protocol vocabulary, extension distribution, and Web status routes in one package. The browser extension is a generated artifact without an authored source in this repository, and Host and extension operation contracts can drift while their manually synchronized fingerprint remains equal. Tool cancellation, provider startup, connector adoption, wire decoding, and disposal therefore lack one capability owner.

## Proposal

Split Chrome into a provider-neutral protocol, an owner-scoped `ctx.chrome` Service Definition, a local bridge provider, a model-facing atomic-tool Consumer, and a separate Web/UI Consumer. One canonical operation descriptor source will generate model schemas, wire unions, result contracts, extension dispatch, protocol revisions, artifacts, and catalog inputs. The stable kernel protocol covers authentication, transport, journal, cancellation, acknowledgement, and executor envelopes; operation/page-program revisions change without extension reload.

The Service Definition accepts an exact initiating Agent and required AbortSignal. One provider starts completely before publication, rejects duplicates and missing providers, records command outcome semantics, and awaits provider quiescence during disposal. The local provider owns loopback HTTP/HMAC, credentials, connector lease, browser-session ownership, durable broker, extension artifacts, and bounded runtime decoding. Connector adoption commits only after challenge-response proof. The model Consumer owns tool names, model schemas, argument projection, cancellation forwarding, and presentation. The client UI consumes secret-free status and artifact metadata.

Existing model-visible tool names and durable session semantics remain stable unless a separate breaking decision is recorded. Chrome remains host-plane because the bridge owns process-singleton browser state; moving tools behind agent presets is a separate decision. Existing Chrome notes remain authoritative for credential pinning, connector lease selection, page deadlines, mailbox recovery, stale ownership, and protocol diagnostics until this proposal ships and explicitly transfers each invariant.

## Alternatives considered

**Continue patching generated service-worker.js.** Rejected: generated output has no source-of-record or deterministic freshness gate, so source, bundle, evidence, and live extension can drift again.

**Rewrite browser automation without a capability split.** Rejected: Action Graph, real Chrome input, durable journal, safe stale recovery, and may-mutate unknown-outcome semantics are valuable behavior that can move behind a better seam.

**Keep the monolithic package and add more runtime flags.** Rejected: credentials, transport, model schemas, UI routes, and browser execution evolve independently and require separate lifecycle and testing owners.

**Make every operation change require extension reload.** Rejected: tool descriptions, page programs, result projections, and wait observations change frequently during development; a stable kernel plus authenticated dynamic operation revision removes that reload cost without allowing unauthenticated remote code.

## Consequences

The migration adds package boundaries and a build pipeline before it removes the legacy package. The extension kernel must retain strict authentication, bounded dynamic program execution, durable journal recovery, and fail-closed kernel compatibility. A real built-artifact Chrome smoke lane becomes required in addition to source and bundle tests. Provider-specific HTTP details no longer leak into tools or UI, while headless composition can omit the Web adapter explicitly.

Cross-reference authorities:

- [Chrome owner secret process pin](../../implemented/bug-fix/2026-08-21-chrome-owner-secret-process-pin.md)
- [Chrome live connector slot](../../implemented/bug-fix/2026-08-21-chrome-live-connector-slot.md)
- [Chrome page command deadlines](../../implemented/bug-fix/2026-08-22-chrome-page-command-deadlines.md)
- [Chrome wait mailbox recovery](../../implemented/bug-fix/2026-08-22-chrome-wait-mailbox-wedge.md)
- [Chrome stale ownership recovery](../../implemented/bug-fix/2026-08-23-chrome-safe-stale-ownership-recovery.md)
- [Chrome protocol and poll diagnostics](../../implemented/bug-fix/2026-08-23-chrome-protocol-fingerprint-poll-diagnostics.md)

The proposal currently supersedes no implemented note. Any transfer or consolidation occurs only after the corresponding behavior and verification ship.
