# Agent Note: Irreducible fork patches on upstream core/shared

Status: implemented

English | [中文](2026-08-25-irreducible-fork-core-patches.zh.md)

## Problem

After the fork extract work for Profile Bundles, Stats UI, Subagent routing, and Web baselines, some edits still sit inside upstream-owned packages under `packages/core`, `packages/sandbox`, and the shell tools that share sandbox escalation. Leaving product policy in those files permanently widens every upstream merge. Removing the remaining edits without a replacement either drops create-time reasoning effort from child routes or restores a sandbox failure mode that blocks ordinary model tool use.

## Decision

Keep exactly two general fork infrastructure patches on upstream core/shared code. Everything else that diverges from official trees for product tools, catalogs, UI, or compositions belongs in plugins, fork Profile Bundles, or the package that owns the harvest entry — not in these shared files.

### 1. `AgentOptions.reasoningEffort` and the first-request seed

`AgentOptions` carries optional `reasoningEffort` beside `provider`/`model`/`maxTokens`. The loop seeds it only on the first proposal of a loop instance (`seedEffort = logged same-route effort ?? options.reasoningEffort`) before `agent/request`; after that instance logs a header, later proposals follow the logged config. The request-reconstruction invariant compares dispatched `reasoningEffort` to the folded `request/header`, so a silent drift fails closed.

This is create-time route infrastructure, not a product default. Parents that pick a child LLM route (owned by the Subagent branch) write the chosen effort into `AgentOptions`; Host create/resume paths may omit it. Model-visible effort still appears only through the logged header after `prepareCall`.

### 2. Non-widening sandbox escalation is omitted

`approveEscalation` returns the effective mode when the requested mode is not strictly wider, and never prompts. Strictly wider asks still require approval before execution. `bash`, `pwsh`, and filesystem mutation tools share that helper. Rationale and tests live in the [non-widening omit](../bug-fix/2026-08-24-non-widening-sandbox-omit.md) note; this note only classifies the edit as irreducible shared enforcement rather than product policy.

## Alternatives considered

**Seed create-time effort only through an `agent/request` waterfall in child setup.** Rejected: `maxTokens` already seeds from `AgentOptions` on the first proposal; a second channel for effort would force every creator to reimplement the same first-request rule and would still need a typed create-time field for Subagent route overrides.

**Keep failing non-widening `sandbox_permissions`.** Rejected: same-mode asks are habitual on models trained for Codex-style tools; failing them does not tighten confinement and blocks work already allowed by the session mode. See the omit note.

**Treat tool-catalog harvest list edits in `packages/core/tools/tests` and `scripts/gen-tool-catalog.ts` as core infrastructure.** Rejected: those deltas track which `tool-*` packages exist in the monorepo. Completeness already comes from `assertManifestComplete` plus per-package harvest recipes owned with the product packages (Bundles / Subagent / Web).

**Move sandbox omit into a product plugin that wraps shell tools.** Rejected: confinement and approval ordering must stay in the shared `approveEscalation` path every enforcing family calls; a wrapper could diverge per tool and weaken fail-closed behavior.

## Consequences

Upstream merges re-apply only the reasoning-effort seed/invariant and the sandbox omit (plus their paired READMEs/tests). Product catalogs, Chrome/zeroY/Schedule UI, list-models composition, Stats, and workspace-git stay out of `dsh-base` / `dsh-web-app` and out of this irreducible set. Subagent routing depends on the `AgentOptions.reasoningEffort` field remaining on the agent package.

## Testing

`packages/core/agent-loop/tests/request-reconstruction.spec.ts` seeds create-time effort on the first request and logs it without an adapter-default marker. `packages/core/agent-loop/tests/invariant.spec.ts` rejects a dispatched effort that disagrees with the folded header. Sandbox and shell package tests pin the omit behavior as documented in the omit note.
