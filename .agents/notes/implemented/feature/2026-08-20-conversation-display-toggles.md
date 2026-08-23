# Agent Note: Conversation display toggles for the stats line and workspace git

Status: implemented

English | [中文](2026-08-20-conversation-display-toggles.zh.md)

## Problem

The composer stats line always showed every group that had data, and the session header had no workspace git chrome. Operators who want a quieter footer, or who need branch / dirty / upstream / HEAD-diffstat while they work, had no per-group control and no Host sample that stayed off the session log.

## Decision

`ConversationSettings` (`ui-conversation` in `$DSH_HOME/settings.yaml`) carries nine booleans, all default on, next to `busyEnter`. Old documents that only store `busyEnter` resolve the flags through schema defaults. `ConversationDisplayPolicy` owns the live record; `ComposerSubmissionPolicy` stays busy-Enter only.

General settings registers two blocks: stats-display (order 30) and git-display (order 40). Each switch is `role="switch"`. A group or chip with no data still hides itself when its flag is on. All five stats flags off hide the stats line; all four git flags off hide the git chrome.

The stats line stays in `conversation.composer.dock`. Context occupancy stays on `ContextMeter`. Provider / model / effort stay on the composer model seat. The duration group adds the matched tool-call count (`Tools {count}× {duration}`). The token group is `Uncached · Input · Output` (billed input remains uncached + cacheRead + cacheWrite). `sessionStats` adds `toolCalls` on the same matched `tool/call` → `tool/result` pairing as `toolMs`, `stateVersion` 2. Unmatched leftovers at `turn/end` do not count. The window fallback counts `tool-result` nodes that carry `callTime`.

Workspace git is a Host sample, not a session projection, and is never written to the session log. `@deepseek-ai/dsh-workspace-git` publishes `ctx.workspaceGit.sample(cwd)` (`timeoutMs`, default 5000). The handwritten `workspace.gitStatus({ path })` method re-declares `WorkspaceGitStatus` in apiproxy so the browser contract stays host-package-free. The gateway uses `ctx.get('workspaceGit')` and does not inject the service. A missing plugin fails with `internal`; an empty path fails with `workspace-invalid-path`; any client RPC error becomes `{ present: false }`. The assembled fixture and `FakeApiClient` always return `{ present: false }` so snapshots do not sample the real tree.

Header chrome occupies `conversation.session.header.utilities` (`workspace-git`). Detached HEAD is how the branch chip renders (`HEAD {sha}`), not a tenth toggle. `+N −M` is versus HEAD; the chip title says so. The client polls every `GIT_STATUS_POLL_MS` (5000), a UI constant, only while at least one git flag is on and the session cwd is a non-empty string.

## Alternatives considered

**A master “show stats / show git” switch plus per-group flags.** Rejected because an all-off block already hides that chrome, and a tenth control would duplicate the same decision.

**Put git facts on the session projection or the session log.** Rejected because model-visible input must be reconstructable from the log, and this chrome is a Host filesystem read, not a conversation event.

**Typert remotes for `workspace.gitStatus`.** Rejected because the workspace domain is already a handwritten `IApiClient` face; a second remote stack would split one domain across two registries.

**Inject `workspaceGit` on `ApiProxyService`.** Rejected because every assembly without the plugin would pend the gateway.

**Session-relative `+N −M`.** Rejected because the product number is working-tree versus HEAD; attributing it to “this conversation” is false.

**Context occupancy or provider/model/effort as more toggles.** Rejected because those facts already have other homes (ContextMeter, composer model seat).

## Consequences

Operators hide individual stats-line groups and git chips without losing the others. Assemblies without `workspace-git` still boot; the header stays empty. Snapshot replay never sees a real work tree. `sessionStats` caches bump to `stateVersion` 2 and rebuild.

## Testing

Package tests cover schema defaults, display-policy adopt/write, both General rows, StatsLine group gating plus the new token and tool-count copy, `toolCalls` pairing, git porcelain/shortstat parsing, real temp-repo samples, Loader composition, `workspace.gitStatus` empty-path and missing-plugin codes, fixture `{ present: false }`, and header-chip polling. Assembled settings-chrome dialog snapshots include the two General blocks.
