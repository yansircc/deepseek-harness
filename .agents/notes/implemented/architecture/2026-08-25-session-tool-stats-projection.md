# Agent Note: Independent sessionToolStats projection for matched tool-call counts

Status: implemented

English | [中文](2026-08-25-session-tool-stats-projection.zh.md)

## Problem

Local forks added a whole-session matched tool-call count (`toolCalls`) inside `@deepseek-ai/dsh-session-stats`, bumping that unit to `stateVersion` 2. Upstream `sessionStats` owns turn/step counts and wall times only. Keeping the local count field in the upstream package blocks clean merges and couples a fork-only UI figure to a shared projection key.

## Decision

`@deepseek-ai/dsh-session-tool-stats` registers an independent `sessionToolStats` projection unit whose view is `{ toolCalls }`. Pairing matches `sessionStats.toolMs` and the window fold: count `tool/call` → `tool/result` by callId; drop unresolved calls at `turn/end`; ignore orphan results. `stateVersion` is 1. Upstream `@deepseek-ai/dsh-session-stats` stays byte-identical to upstream/master for this field (no `toolCalls`, `stateVersion` 1).

The web-app bundle mounts both plugins. `@deepseek-ai/dsh-client-ui-stats` composes `useProjection('sessionStats')` with `useProjection('sessionToolStats')` for the `Tools {count}× {duration}` group. Assemblies without `sessionStats` still fall back to `deriveStats` wholesale (including its window `toolCalls`). When `sessionStats` is present and `sessionToolStats` is not, the count is 0 while duration still comes from `toolMs`.

## Alternatives considered

**Keep `toolCalls` on `sessionStats` and diverge from upstream forever.** Rejected because every upstream sync would re-litigate the field and `stateVersion` bump.

**Move `toolMs` into the new package with the count.** Rejected for this slice: duration already ships upstream on `sessionStats`; only the local count needed extraction.

**Derive the count in the client from loaded nodes whenever `sessionStats` is present.** Rejected because paging and compaction would again scope the figure; a durable projection is the same architecture as the other whole-session numbers.

## Consequences

Fork-local tool-count UI no longer patches upstream session-stats. Projection caches for `sessionStats` stay on upstream `stateVersion` 1; `sessionToolStats` has its own cache key. Consumers that need both duration and count must compose both units (web-app does). See also [conversation display toggles](../feature/2026-08-20-conversation-display-toggles.md).

## Testing

Package tests cover empty-log zeros, matched-pair counting with change-feed seq, late mount, HMR unload, Loader composition, orphan/prune/`constructor` callId folds. Client tests cover StatsLine composition of `sessionStats` + `sessionToolStats` for the Tools group. The connection fixture serves both keys and advances `sessionToolStats` on `tool/result`.
