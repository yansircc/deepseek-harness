# Agent Note: Workspace Git owns its Typert Remote endpoint

Status: implemented

English | [中文](2026-08-25-workspace-git-typert-remote.zh.md)

## Problem

`workspace.gitStatus` lived on the fixed Host apiproxy workspace RPC map even though its implementation was only an optional `ctx.get('workspaceGit')` lookup plus a sample. That duplicated the browser contract across apiproxy schemas, routes, client stubs, fixtures, and the business package, and kept cwd sampling on the handwritten workspace domain after Typert Remotes already carried other unary Host reads ([unary migration proposal](../../proposed/architecture/2026-08-10-unary-apiproxy-remote-migration.md)). The earlier display-toggles note rejected a Remote for this call because the workspace domain already had an `IApiClient` face; that rationale treated transport ownership as inseparable from the workspace registry domain.

## Decision

`@deepseek-ai/dsh-workspace-git` is a `TypertRemoteService` on Cordis key / wire namespace `workspaceGit`. It decorates `sample(cwd, signal)` with `@Remote('sample')`. The method returns `WorkspaceGitSample` from the package `./types` export. Caller cancellation is the final `AbortSignal`, combined with Config `timeoutMs` through `AbortSignal.any`. Empty cwd, missing git, non-work-tree paths, timeout, and abort still resolve `{ present: false }`.

`@deepseek-ai/dsh-api-remotes/client` mounts the generated `/remote` contribution. `@deepseek-ai/dsh-client-ui-workspace-git` calls `ctx.remote.workspaceGit.sample` through a local Remote face type and maps any failure to `{ present: false }`. The handwritten `workspace.gitStatus` method, schemas, routes, stubs, fixtures, and `WorkspaceGitStatus` re-declarations are removed from apiproxy and client connection.

This supersedes the “Typert remotes for workspace.gitStatus” rejection in [conversation display toggles](../feature/2026-08-20-conversation-display-toggles.md): the sample is not a workspace-registry operation, so it does not belong on that fixed RPC face.

## Alternatives considered

**Keep `workspace.gitStatus` on apiproxy.** Rejected because the call has a natural Service owner and no BFF lifecycle policy; the duplicated wire face is exactly what Typert Remotes remove.

**Companion package solely for the Remote adapter.** Rejected because the existing service signature is the consumer contract; an identity `remote*` wrapper would add a package without an independent owner.

**Preserve empty-path as `workspace-invalid-path`.** Rejected because the service already returns `{ present: false }` for empty cwd, and the UI already collapses every Remote/RPC miss to that value.

## Consequences

Cwd git sampling is owned end-to-end by `workspace-git` plus the selected api-remotes mount. Assemblies without the Host plugin still boot; sample calls fail at the gateway and the header stays empty. Snapshot fixtures no longer need a stub `workspace.gitStatus` row.

## Required verification

- Package tests cover Remote binding names, Loader composition, timeout-plus-caller abort, and real temp-repo samples.
- Focused apiproxy and connection tests no longer register `workspace.gitStatus`.
- `ui-workspace-git` browser-plugin specs drive `ctx.remote.workspaceGit.sample` including cancellation.
- Host build emits `./typert` and `./remote` for `dsh-workspace-git`; api-remotes mounts the contribution.
