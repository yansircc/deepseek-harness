# Agent Note: Fork-owned Profile bundles keep upstream base/web-app clean

Status: implemented

English | [中文](2026-08-25-fork-owned-profile-bundles.zh.md)

## Problem

This fork's Chrome, zeroY, Schedule UI, list-models, session-tool-stats, and workspace-git composition rows lived inside upstream-owned `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app` patches. Every merge from official `dsh-base`/`dsh-web-app` re-fought those inserts, and the upstream packages could not stay byte-close to deepseek-ai while the fork still shipped those defaults.

## Decision

Fork-owned rows move into explicit in-box Profile Bundles:

- `@deepseek-ai/dsh-fork-base` inserts Host-plane `tool-list-models`, `tool-zeroy`, and `tool-chrome` after `dsh-base`.
- `@deepseek-ai/dsh-fork-web` inserts workspace-git, session-tool-stats, time-context, schedule, and the matching client UI rows after `dsh-web-app`, and disables Host-plane `tool-list-models` so agent presets own that tool.

Shipped templates become:

- web: `dsh-base` → `dsh-fork-base` → `dsh-web-app` → `dsh-fork-web`
- headless: `dsh-base` → `dsh-fork-base` → `dsh-headless`

`apps/cli` depends on both fork bundles so installation-first resolution and the healed `$DSH_HOME/profiles/node_modules` fallback keep covering their dependency closures. `loadProfile` rewrites exact prior installation-owned web and headless tuples onto the new templates. Cursor stays the separate optional Bundle `@deepseek-ai/dsh-subagent-cursor` (already outside `dsh-base`); it is not part of the default templates.

Upstream `dsh-base` and `dsh-web-app` patches and dependency manifests return to official content for these rows.

## Alternatives considered

**Keep fork rows inside dsh-base/dsh-web-app.** Rejected: it maximizes permanent diff against upstream for every merge.

**One meta fork Bundle for all planes.** Rejected: headless needs the Host tools without Web UI, and web must disable Host-plane list-models after web-app's agent-plane move; two layers match those planes.

**Leave fork features opt-in only via `dsh plugin add`.** Rejected: it would change the fork's default `dsh web` / `dsh --profile headless` behavior.

## Consequences

Bought: upstream base/web-app stay mergeable; fork defaults preserve Chrome, zeroY, Schedule, list-models, stats, and workspace git; Cursor remains an explicit optional Bundle.

Cost: two more in-box bundles, template migration for existing profiles, and scaffolds/tests that hardcode the web stack must list the fork layers.

## Testing

`packages/bundle/fork-base/tests/fork-base.spec.ts` and `packages/bundle/fork-web/tests/fork-web.spec.ts` pin patch rows and dependencies. `packages/bundle/base/tests/base.spec.ts` asserts the fork tool rows stay out of upstream base. `packages/boot/app-boot/tests/profile.spec.ts` pins template contents and installation-owned tuple normalization. Web e2e scaffold and web-agent-presets composition apply the four-layer web stack.
