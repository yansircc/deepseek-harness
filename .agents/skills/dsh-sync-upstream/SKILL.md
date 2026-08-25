---
name: dsh-sync-upstream
description: Use when updating the DeepSeek Harness fork from an official upstream tag or upstream/master, estimating conflicts before merge, resolving fork-owned versus upstream-owned files, regenerating derived artifacts, validating the integration, or requests mentioning upstream sync, upstream upgrade, merge official release, 跟随上游, or 上游升级.
---

# DSH Sync Upstream

Use this skill to merge an official DeepSeek Harness release into this fork without rewriting fork history or reintroducing fork-owned behavior into upstream-owned packages.

## Choose the target

Fetch current refs first:

```sh
git fetch upstream --prune --tags
```

Prefer an official `dsh-v*` tag. Use `upstream/master` only when the user explicitly wants the latest unreleased state.

Require a clean worktree before the merge. Do not stash or rewrite local history implicitly.

## Plan before changing history

Run the repository planner:

```sh
pnpm run upstream:plan -- <target-ref>
```

Read these fields:

- `divergence.upstreamOnly`: incoming commit count.
- `merge.clean` and `merge.conflicts`: non-mutating `git merge-tree` rehearsal.
- `affectedForkAreas`: fork-owned packages touched by the incoming range.
- `irreducibleCore`: the small core patch set that must survive.
- `suggestedChecks`: initial evidence inventory.

Also record the exact endpoints:

```sh
git rev-parse HEAD <target-ref>
git merge-base HEAD <target-ref>
```

Report the predicted conflict count and distinguish authored source from generated docs, translation records, snapshots, and lockfiles.

## Merge forward

Use a merge commit, not a repository-wide rebase:

```sh
git merge --no-ff <target-ref>
```

Use the message:

```text
merge(dsh): integrate official <version>
```

A merge preserves the fork's topic history and makes release integrations bisectable.

## Resolve by ownership

Resolve in this order:

1. Public types and service APIs.
2. Authored implementation.
3. Focused tests.
4. Authored English and Chinese documentation.
5. Generated artifacts and snapshots.

Ownership rules:

- Prefer upstream for `packages/bundle/base` and `packages/bundle/web-app`; fork product rows belong in `fork-base` and `fork-web`.
- Preserve fork-owned packages reported by `upstream:plan` unless upstream now supplies equivalent behavior and the user authorizes retirement.
- Preserve the irreducible core behavior documented by `2026-08-25-irreducible-fork-core-patches.md`: reasoning-effort request seed/reconstruction and non-widening sandbox escalation omission.
- Keep route policy in `subagent-route-policy`, stats UI in `ui-stats`, tool-call counts in `session-tool-stats`, model catalog tooling in `tool-list-models`, and Workspace Git UI/Remote in their dedicated packages.
- Do not move security enforcement, model-visible logging, or durable-state decisions into outer wrappers merely to avoid a conflict.

## Regenerate derived files

Never hand-merge generated catalog regions, pairing hashes, or lockfile resolution blocks when their source can be regenerated.

Run only generators invalidated by the resolved source diff, for example:

```sh
pnpm install --lockfile-only
pnpm run gen-doc-graphs
pnpm run gen-tool-catalog
pnpm run gen-config-catalog
pnpm run gen-cordis-catalog
pnpm run gen-persistence-catalog
```

Resolve bilingual authored content first, then record each pair:

```sh
pnpm run verify-translation-pairing --write <english-document>
```

For snapshots, resolve implementation first. Refresh only reviewed intentional behavior; never mix ours/theirs JSONL records by hand.

## Validate the integrated behavior

Start with the focused checks selected by `upstream:plan`, then add evidence for every manually resolved semantic conflict.

Typical cross-package integration checks:

```sh
pnpm run typecheck
pnpm run build
pnpm run doc-sync
```

For GUI changes:

```sh
pnpm run test:gui
DSH_SNAPSHOT=replay pnpm run test:web:serial
```

Use `test:web:serial` on hosts that exhaust ephemeral ports under parallel Web scaffolds. Record environment-specific failures rather than refreshing their cascaded goldens.

Run `git diff --check` and confirm no unmerged paths remain.

## Final audit and push

Before push, invoke `dsh-pre-push-checks` and inspect the complete outgoing scope against the verified live base:

```sh
pnpm --silent run change-scope --base origin/master
```

Confirm the target is integrated:

```sh
git merge-base --is-ancestor <target-ref> HEAD
pnpm run upstream:plan -- <target-ref>
```

The final plan must report `upstreamOnly: 0` and a clean merge rehearsal.

Push normally, then verify exact equality:

```sh
git push origin master
git fetch origin --prune
git rev-parse HEAD origin/master
```

Report checks actually run, the merge commit, remaining intentional core differences, and remote CI as passed, failed, pending, or unavailable.
