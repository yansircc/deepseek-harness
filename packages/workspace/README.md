# workspace/ — workspace entity family

English | [中文](README.zh.md)

This family owns persistent workspaces: user directories with titles and ordered session membership, plus a Host git sample for header chrome.

| Package | Role | ctx key |
|---|---|---|
| [`workspace/`](workspace/README.md) | Registers workspaces and accounts for their sessions | `ctx.workspaceRegistry` |
| [`workspace-git/`](workspace-git/README.md) | Samples one cwd's git facts for session-header chrome | `ctx.workspaceGit` |

The [workspace package reference](workspace/README.md) owns lifecycle, persistence, and deletion semantics. The git sample is a Host read and is never written to a session log.

The subsystem reference — the entity, realpath canon, registration/resolution — is [docs/subsystems/workspace.md](../../docs/subsystems/workspace.md); storage design in the [domain KV storage Agent Note](../../.agents/notes/proposed/architecture/2026-07-24-domain-kv-storage-and-workspace.md).
