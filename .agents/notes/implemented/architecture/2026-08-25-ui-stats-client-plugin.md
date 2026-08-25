# Agent Note: Stats line UI is an independent client plugin

Status: implemented

English | [中文](2026-08-25-ui-stats-client-plugin.zh.md)

## Problem

The composer stats line, its five General Settings toggles, and the `ui-conversation` settings fields that backed them lived inside `@deepseek-ai/dsh-client-ui-conversation` beside busy-Enter. That placement made a fork-owned projection composition (`sessionStats` + `sessionToolStats` + `tokenUsage`) look like upstream conversation chrome, forced every assembly that wanted conversation to also own the stats strip, and blocked merging upstream conversation changes without re-litigating the local strip.

## Decision

`@deepseek-ai/dsh-client-ui-stats` under `packages/client/ui-stats` owns `StatsLine`, `StatsDisplayRow`, the five display flags, locale copy, CSS, and Host schema registration. It contributes through `ctx.slots.inject` into `conversation.composer.dock` and `settings.general.item`.

`ui-conversation` declares `conversation.composer.dock` as a **single** session-scoped seat and leaves it empty: one registrant owns the ambient band, a second registration at the same priority fails loud, and an unoccupied seat renders nothing. That is the minimal general extension point for optional ambient readouts; the shipped occupant is the stats plugin. Display behavior matches the prior strip: five booleans default on, all-off hides the line, groups still hide themselves when they have no data, and cache-hit decimal display stays on the presentation layer ([high-cache-hit decimals](../feature/2026-08-19-high-cache-hit-decimal-display.md)).

Durable preferences use the `ui-stats` settings namespace with the same field names. `ui-conversation` keeps only `busyEnter`. Context occupancy stays on `ContextMeter` inside ui-conversation with local `formatTokens` / `contextOccupancy` helpers. The shipped web-app bundle loads the new row beside `ui-conversation`.

Cross-link: product behavior for the toggles and projection composition remains recorded in [conversation display toggles](../feature/2026-08-20-conversation-display-toggles.md) and [sessionToolStats](2026-08-25-session-tool-stats-projection.md).

## Alternatives considered

**Keep StatsLine inside `ui-conversation`.** Rejected: the strip's fork-local tool-count composition and display flags are not conversation-domain chrome, and direct component imports from another plugin would bypass slot lifecycle.

**Keep the five flags under the `ui-conversation` settings namespace.** Rejected: removing stats fields from `ConversationSettings` is the ownership cut; pre-release allows a new namespace without a migration shim.

**Leave `conversation.composer.dock` as a list.** Rejected for this cut: a list would allow a second ambient entry beside the stats line; a single seat is the minimal guarantee that one plugin owns the band without duplicate entries.

**Move ContextMeter with the stats package.** Rejected: occupancy already has a distinct home on the composer tool row and must stay when the stats plugin is omitted.

## Consequences

Bought: optional mounting of the stats strip without owning conversation settings; `ui-conversation` no longer registers the dock occupant or stats-display row; package and slot catalog ownership match the fork feature.

Cost: one more client plugin and bundle row; prior on-disk `ui-conversation` stats flags are ignored until re-toggled under `ui-stats`.

## Testing

`packages/client/ui-stats/tests/` covers schema defaults, display-policy adopt/write, StatsDisplayRow, StatsLine derivation/gating/composition (including `sessionToolStats`), and apply wiring for both slots. `ui-conversation` apply specs assert the stats registrations are absent and the dock seat stays declared empty. `pnpm run test:gui` covers the GUI package pair.
