# @deepseek-ai/dsh-workspace-git

English | [中文](README.zh.md)

Host plugin publishing `ctx.workspaceGit.sample(cwd, signal)` as the Typert Remote `workspaceGit.sample`: one directory's git facts for session-header chrome. The sample is a Host read of the operator's work tree. It is never written to a session log, never injected into a prompt, and never counted as session-relative change.

## Sample

- `git rev-parse --is-inside-work-tree` — a miss, a bare repo, a missing git binary, or a timeout returns `{ present: false }`.
- `git rev-parse --short HEAD` — `shortHead`. An empty repository without a commit is a miss.
- `git symbolic-ref --short HEAD` — `branch` when attached; omitted when detached. Detached chrome is `HEAD {shortHead}` at the consumer.
- `git status --porcelain=v1 --branch` — `dirty` is the porcelain entry count, including untracked (`??`). `ahead` / `behind` appear only when the branch line names a non-zero side.
- `git diff --shortstat HEAD` — `insertions` / `deletions` versus HEAD. Untracked files do not appear here.

`timeoutMs` (default 5000, minimum 1) is the only Config field and covers every child in one `sample()` call. Caller cancellation is the Remote's final `signal` parameter, combined with that budget. The client poll cadence is a separate UI constant.

## Composition

```yaml
- id: workspace-git
  name: '@deepseek-ai/dsh-workspace-git'
```

The web-app bundle mounts this row so the live Typert gateway can resolve `ctx.workspaceGit`. Client assemblies mount the generated `/remote` contribution through `@deepseek-ai/dsh-api-remotes/client`. Assemblies without this Host plugin still boot; `workspaceGit.sample` then fails at the gateway and the UI treats the miss as `{ present: false }`.

## Model Experience

None, as the plugin only samples the host filesystem for client header chrome and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the plugin never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **A miss hides the chrome** — not a work tree, no git on PATH, an empty path, a timeout, or caller abort all resolve `{ present: false }`.
- **Diffstat is versus HEAD, not this conversation** — the header title states that; there is no session-relative `+N −M`.
- **Untracked files raise `dirty` only** — they do not appear in `insertions` / `deletions`.
