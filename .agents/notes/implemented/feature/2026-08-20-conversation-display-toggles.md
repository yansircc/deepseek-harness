# Agent Note: Conversation display toggles for the stats line and workspace git

Status: implemented

English | [中文](2026-08-20-conversation-display-toggles.zh.md)

## Problem

The composer stats line always showed every group that had data, and the session header had no workspace git chrome. Operators who want a quieter footer, or who need branch / dirty / upstream / HEAD-diffstat while they work, had no per-group control and no Host sample that stayed off the session log.

## Decision

`ConversationSettings` (`ui-conversation` in `$DSH_HOME/settings.yaml`) carries `busyEnter` only. Stats-line display flags live in `@deepseek-ai/dsh-client-ui-stats` under the `ui-stats` namespace ([ownership](../architecture/2026-08-25-ui-stats-client-plugin.md)). Workspace-git display flags live in `@deepseek-ai/dsh-client-ui-workspace-git` under the `ui-workspace-git` namespace ([ownership](../architecture/2026-08-25-ui-workspace-git-client-plugin.md)). `ComposerSubmissionPolicy` stays busy-Enter only.

General settings registers stats-display (order 30, `ui-stats`) and git-display (order 40, `ui-workspace-git`). Each switch is `role="switch"`. A group or chip with no data still hides itself when its flag is on. All five stats flags off hide the stats line; all four git flags off hide the git chrome.

The stats line occupies the single `conversation.composer.dock` seat via the `ui-stats` client plugin. Context occupancy stays on `ContextMeter`. Provider / model / effort stay on the composer model seat. The duration group adds the matched tool-call count (`Tools {count}× {duration}`). The token group is `Uncached · Input · Output` (billed input remains uncached + cacheRead + cacheWrite). `@deepseek-ai/dsh-session-tool-stats` owns `sessionToolStats.toolCalls` on the same matched `tool/call` → `tool/result` pairing as `sessionStats.toolMs`. Unmatched leftovers at `turn/end` do not count. The window fallback counts `tool-result` nodes that carry `callTime`.

Workspace git is a Host sample, not a session projection, and is never written to the session log. `@deepseek-ai/dsh-workspace-git` publishes `ctx.workspaceGit.sample(cwd, signal)` (`timeoutMs`, default 5000) as the Typert Remote `workspaceGit.sample` ([ownership](../architecture/2026-08-25-workspace-git-typert-remote.md)). `@deepseek-ai/dsh-client-ui-workspace-git` calls that Remote; any failure becomes `{ present: false }`. Assemblies without the Host plugin still boot; the header stays empty. Snapshot replay never samples the real work tree.

Header chrome occupies `conversation.session.header.utilities` (`workspace-git`) via the `ui-workspace-git` client plugin. Detached HEAD is how the branch chip renders (`HEAD {sha}`), not a tenth toggle. `+N −M` is versus HEAD; the chip title says so. The client polls every `GIT_STATUS_POLL_MS` (5000), a UI constant, only while at least one git flag is on and the session cwd is a non-empty string.

## Alternatives considered

**A master “show stats / show git” switch plus per-group flags.** Rejected because an all-off block already hides that chrome, and a tenth control would duplicate the same decision.

**Put git facts on the session projection or the session log.** Rejected because model-visible input must be reconstructable from the log, and this chrome is a Host filesystem read, not a conversation event.

**Typert remotes for `workspace.gitStatus`.** Initially rejected while the call lived on the handwritten workspace `IApiClient` face; superseded by moving the sample off that face onto `workspaceGit.sample` ([Remote ownership](../architecture/2026-08-25-workspace-git-typert-remote.md)).

**Inject `workspaceGit` on `ApiProxyService`.** Rejected because every assembly without the plugin would pend the gateway.

**Session-relative `+N −M`.** Rejected because the product number is working-tree versus HEAD; attributing it to “this conversation” is false.

**Context occupancy or provider/model/effort as more toggles.** Rejected because those facts already have other homes (ContextMeter, composer model seat).

## Consequences

Operators hide individual stats-line groups and git chips without losing the others. Assemblies without `workspace-git` still boot; the header stays empty. Snapshot replay never sees a real work tree.

## Testing

Package tests cover schema defaults, display-policy adopt/write, both General rows (stats in `ui-stats`, git in `ui-workspace-git`), StatsLine group gating plus the new token and tool-count copy, `toolCalls` pairing, git porcelain/shortstat parsing, real temp-repo samples, Loader composition, `workspaceGit.sample` Remote binding and cancellation, and header-chip polling. Assembled settings-chrome dialog snapshots include the two General blocks.
