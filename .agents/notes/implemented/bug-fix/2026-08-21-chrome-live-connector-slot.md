# Agent Note: Chrome owner commands follow the live connector lease

Status: implemented

English | [中文](2026-08-21-chrome-live-connector-slot.zh.md)

## Problem

`chrome_status` can report a connected extension while the next `chrome_*` command fails with `BridgeUnavailable: Bound Chrome connector <other-id> is offline`. The two ids are different: status walks adopted profiles until it finds a live broker lease, and `sendBound` sent to `connectors.list()[0]`. After an extension reload or a second unpacked load, the first adopted id stays in the map without a lease, and owner commands keep targeting it.

## Decision

`ConnectorOwner.adopt` keeps a single bound slot: presenting a new `connectorId` evicts every other id and drops those mailboxes. `liveConnector` is the shared selector for status and owner commands: the first adopted profile whose mailbox currently holds a live lease. When no lease is live, owner commands throw `BridgeUnavailable` with the not-connected message instead of naming a leftover offline id.

## Alternatives considered

**Keep every adopted id and teach `sendBound` to pick the live one.** That would also stop the mismatch. Rejected: a reload or a second unpacked extension would leave ghost mailboxes that still accept a later poll if the old worker wakes, and status vs command would still have to agree on a priority rule.

**Require the owner request to name a `connectorId`.** Rejected: tools and the settings card are one-Chrome-profile products; the bound slot is the host's choice, not a model-visible argument.

## Consequences

The most recent handshake wins the slot. Two loaded unpacked extensions cannot stay bound at once; the later handshake evicts the earlier id even if that worker is still polling.

A command that arrives before the live connector's first `/next` poll sees "extension is not connected", the same as a bridge that never adopted anyone.

## Testing

`packages/chrome/chrome-local/tests/connector-owner.spec.ts` pins same-id rehandshake, eviction of the previous id, and `liveConnector` skipping an offline first profile. `packages/chrome/chrome-local/tests/provider.spec.ts` handshakes a stale id then a live id, asserts the owner command does not name the stale offline id, completes a poll/result round-trip on the live id, and keeps a live lease when a later handshake header does not match the body.
