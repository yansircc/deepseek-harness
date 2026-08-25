# @deepseek-ai/dsh-client-ui-workspace-git

English | [中文](README.zh.md)

Session-header workspace Git chrome and its General Settings display toggles. The chip occupies `conversation.session.header.utilities` (`workspace-git`); the preference block occupies `settings.general.item` (`git-display`, order 40). Sampling uses the Host `workspaceGit.sample` Remote and is never written to the session log.

```yaml
- id: ui-workspace-git
  name: '@deepseek-ai/dsh-client-ui-workspace-git'
```

`WorkspaceGitSettings` (`ui-workspace-git` in `$DSH_HOME/settings.yaml`) carries four booleans — `showGitBranch`, `showGitDirty`, `showGitUpstream`, `showGitDiffstat` — all default on. `WorkspaceGitDisplayPolicy` owns the live record. All four flags off hide the header chrome; a chip with no data still hides itself when its flag is on. Detached HEAD renders as `HEAD {sha}`. `+N −M` is versus HEAD; the chip title says so. The client polls every `GIT_STATUS_POLL_MS` (5000) only while at least one flag is on and the session cwd is a non-empty string. Assemblies without this plugin or without a `workspaceGit` Remote leave the header utilities empty for this occupant.

## Model Experience

None, as the chrome samples a Host filesystem fact for the operator and never reaches a prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Prior `ui-conversation` git flags are not migrated** — pre-release settings documents that stored the four flags under `ui-conversation` no longer apply; operators re-toggle under `ui-workspace-git` if they had customized them.
