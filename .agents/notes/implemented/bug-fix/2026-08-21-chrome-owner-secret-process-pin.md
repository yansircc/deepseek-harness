# Agent Note: Chrome owner secret is pinned for the process

Status: implemented

English | [中文](2026-08-21-chrome-owner-secret-process-pin.zh.md)

## Problem

The Web Chrome card reports `offline` ("local service is not running") when the host status route is up and the bridge is listening. `computeChromeStatus` maps every failed owner fetch to `offline`, including HMAC failure. After the owner credential reference moved to `DSH_CHROME_OWNER_CREDENTIAL`, an empty current name caused `ensureCredential` to mint a new hex secret on every call: `started()` loaded key A onto the listener, and the next `/api/chrome/status` poll verified with key B.

The general credentials rule — re-resolve per operation, never cache — is the wrong rule for this HMAC key. The listening `BridgeServer` signs with the value passed to `setOwnerCredential`. A later resolve that returns a different secret cannot authenticate to that listener.

## Decision

`tool-chrome` resolves the owner secret once per process and reuses that promise for `setOwnerCredential`, `chrome_status`, and every `chrome_*` command.

Resolution order is `DSH_CHROME_OWNER_CREDENTIAL` in `ctx.credentials`, then `PI_CHROME_OWNER_CREDENTIAL` in that store, then the same two names in `process.env`. The first non-empty value is pinned. When the value came from the legacy name, the plugin also writes it under `DSH_CHROME_OWNER_CREDENTIAL` if the store accepts the write. An empty store still mints a 64-hex secret and tries to persist it; a rejected write keeps the minted value in-process only.

The plugin still `inject`s only `tools`. Waiting on `credentials` would keep harvest and headless compositions that do not mount a provider from activating. `ctx.get('credentials')` runs inside the pinned load, after other plugins have settled.

The Chrome card shows the host `error` string under the offline label when the payload includes one, instead of only the "restart dsh" hint.

## Alternatives considered

**`inject: ['tools', 'credentials']`.** Apply would wait for `credentials-local` `loadInitial`, so the first resolve would see the file. Rejected: `gen-tool-catalog` mounts `tool-chrome` without a credentials provider; adding the inject without a harvest stub leaves the plugin pending and writes an empty catalog section.

**Re-resolve on every owner call and call `setOwnerCredential` again when the value changes.** That would rotate a live listener without restart. Rejected: in-flight handshakes and the extension's owner view would race the rotation; restart is the explicit rotate path.

**Leave the card hint as "restart the dsh service".** Rejected: that text hid `Shared bridge listener did not prove owner credential possession` and sent operators into a restart loop that reminted another split secret.

## Consequences

A credentials edit after boot does not rotate the listening bridge HMAC key; restart the process to pick up a new stored secret. A composition without `ctx.credentials` still starts the bridge on a minted in-process secret.

The card can show a `BridgeUnavailable` message that names HMAC failure. That is more precise than "service not running" and still uses the offline dot.

## Testing

`packages/chrome/chrome-local/tests/config.spec.ts` pins resolve order, legacy write-back, write-back failure, same-name skip, and single-flight `pinOwnerSecret`. `packages/chrome/tool-chrome/tests/plugin.spec.ts` drives `chrome_status` through a flipped later resolve, a legacy-only store, a rejecting store, a throwing resolve, and a missing credentials service. `packages/client/ui-chrome/tests/chrome-status-view.client.spec.ts` pins the offline hint preferring the host error.
