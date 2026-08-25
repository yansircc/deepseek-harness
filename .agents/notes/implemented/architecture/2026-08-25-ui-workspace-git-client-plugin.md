# Agent Note: Workspace Git UI is an independent client plugin

Status: implemented

English | [中文](2026-08-25-ui-workspace-git-client-plugin.zh.md)

## Problem

Workspace Git header chrome and its General Settings toggles lived inside `@deepseek-ai/dsh-client-ui-conversation` beside the stats-line display preferences. That placement made an optional Host filesystem sample look like conversation-domain chrome, forced `ui-conversation` to own the sample call site, and blocked composing the header utilities without the full conversation plugin graph owning the git fields.

## Decision

`@deepseek-ai/dsh-client-ui-workspace-git` under `packages/client/ui-workspace-git` owns `WorkspaceGitChip`, `GitDisplayRow`, the four display flags, locale copy, CSS, and Host schema registration. It contributes through `ctx.slots.inject` into the existing `conversation.session.header.utilities` and `settings.general.item` seats. Display behavior matches the prior chrome: four booleans default on, all-off hides the chip row, detached HEAD renders as `HEAD {sha}`, `+N −M` is versus HEAD, and polling uses `GIT_STATUS_POLL_MS` (5000) only while a flag is on and cwd is a non-empty string.

Durable preferences use the `ui-workspace-git` settings namespace with the same field names (`showGitBranch`, `showGitDirty`, `showGitUpstream`, `showGitDiffstat`). `ui-conversation` keeps only `busyEnter` and the five stats-line flags. Sampling uses the Host `workspaceGit.sample` Typert Remote through `ctx.get('remote.workspaceGit')` ([Remote ownership](2026-08-25-workspace-git-typert-remote.md)). The shipped web-app bundle loads the new row beside `ui-conversation`.

Cross-link: product behavior for the toggles and Host sample remains recorded in [conversation display toggles](../feature/2026-08-20-conversation-display-toggles.md).

## Alternatives considered

**Keep git chrome inside `ui-conversation`.** Rejected: the sample never touches the conversation session log or stats projections, and the sample call site existed only for this occupant.

**Keep the four flags under the `ui-conversation` settings namespace.** Rejected: removing git fields from `ConversationSettings` is the ownership cut; pre-release allows a new namespace without a migration shim.

**Change Host sampling transport while extracting the UI package.** Deferred then; completed separately by moving off apiproxy onto `workspaceGit.sample` ([Remote ownership](2026-08-25-workspace-git-typert-remote.md)).

## Consequences

Bought: optional mounting of workspace-git chrome without owning conversation settings; `ui-conversation` no longer owns the git sample call site; package and slot catalog ownership match the feature.

Cost: one more client plugin and bundle row; prior on-disk `ui-conversation` git flags are ignored until re-toggled under `ui-workspace-git`.

## Testing

`packages/client/ui-workspace-git/tests/` covers schema defaults, display-policy adopt/write, GitDisplayRow, WorkspaceGitChip polling/abort, and apply wiring for both slots. `ui-conversation` apply specs assert the git registrations are absent. `pnpm run test:gui` covers the GUI package pair.
