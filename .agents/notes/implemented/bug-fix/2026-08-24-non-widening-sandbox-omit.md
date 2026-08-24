# Agent Note: Non-widening sandbox_permissions is omitted

Status: implemented

English | [中文](2026-08-24-non-widening-sandbox-omit.zh.md)

## Problem

`approveEscalation` rejected any `sandbox_permissions` that was not strictly wider than the call's effective mode. Sessions already on `danger-full-access` (the Full access preset) then failed every bash or fs call that still sent `sandbox_permissions: "danger-full-access"`. Models trained on Codex-style tools send that pair on most commands. The command never ran.

The original fail-closed rule is in [the sandbox decision](../feature/2026-07-06-sandbox.md). It stopped a no-op from opening an approval prompt. It also blocked the habitual same-mode ask.

## Decision

A request that is not strictly wider — the same mode, a narrower mode, or an unknown effective mode — returns the effective mode and does not prompt. Strictly wider requests still go through approval before anything executes. `bash`, `pwsh`, and the filesystem mutation tools share `approveEscalation`, so they all inherit the omit.

## Alternatives considered

**Keep failing same-mode asks.** Rejected: the session is already at the requested access, and the model retries the same doomed pair.

**Treat only `danger-full-access` → `danger-full-access` as omitted.** Rejected: `workspace-write` → `workspace-write` is the same habit one step down the ladder.

**Change the tool schema to say "omit when already at this mode".** Rejected: that regenerates the tool catalog and assembled system-prompt snapshots. Execution omit matches what "omit the field" already meant.

## Consequences

A habitual same-mode `sandbox_permissions` runs under the current mode. A real wider ask still prompts. Schema text is unchanged. There is no assembled snapshot of a same-mode ask succeeding; package tests pin the omit.

## Testing

`packages/sandbox/sandbox/tests/escalation.spec.ts` returns the effective mode for same, narrower, and top-mode asks and asserts no approval request. `packages/shell/tool-bash/tests/tools.spec.ts` and `packages/shell/tool-pwsh/tests/tools.spec.ts` run those calls without an error and without prompting.
