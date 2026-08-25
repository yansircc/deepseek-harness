# Agent Note: Web replay tracks the shipped composition

Status: implemented

English | [中文](2026-08-25-web-replay-shipped-composition-baseline.zh.md)

## Problem

`DSH_SNAPSHOT=replay pnpm run test:web` stopped being a trustworthy local signal after schedule, time-context, Chrome/zeroY, and StatsLine Tools/Uncached shipped into the default Web tree while goldens, overlays, and a few composition assertions still described the pre-shipped surface. Failures mixed intentional stale goldens with real composition bugs and cascading asserts from shared setup, so refresh-or-fix judgment was unreliable.

## Decision

Treat the currently shipped Web composition as the replay baseline:

- `examples/web-schedule/cordis.yml` stays as an empty documented overlay so Loader never sees duplicate `time-context` / `schedule` ids after those rows moved into `packages/bundle/web-app/cordis.patch.yml`.
- `shipped-composition` and `minimal-preset` pin host-plane Chrome/zeroY tools plus agent-scoped Schedule tools as intentional catalog members.
- `pnpm run test:web` and `test:web:refresh` build with `build:official` so local replay matches the CI client profile that registers official brand occupants; `built-boot` still branches on the recorded `DSH_CLIENT_BUILD_PROFILE`.
- Aria goldens are refreshed only for reviewed intentional diffs: time-context injection rows, StatsLine Tools/Uncached text, and the Chrome/zeroY plugin cards.
- Trajectory streaming scroll budget rises from 5 to 6 to absorb the extra layout pass from shipped time-context rows without loosening runaway-scroll detection.
- Configurable plugin cards sort by namespace id so Chrome/zeroY (and later peers) cannot swap order across boots when async client activation rearranges registration.

## Alternatives considered

**Move Chrome/zeroY behind agent presets so the global tools layer stays empty.** Rejected for this baseline: both plugins also own process-singleton host state (Chrome bridge, zeroY site bindings). Splitting host vs tool packages is a separate composition change.

**Keep `test:web` on a non-official build and only relax the brand assertion.** Rejected as the default path: CI already builds official artifacts before web replay, and a local non-official build would keep brand and profile-sensitive signals divergent from the gate.

**Blindly refresh every failing golden.** Rejected: shared-setup cascades (assertConsumed, subagent FIFO length) clear only after the intentional goldens and composition asserts are corrected first.

## Consequences

Local `DSH_SNAPSHOT=replay pnpm run test:web` rebuilds official client artifacts and compares against goldens that describe the shipped schedule/time-context/Chrome/zeroY/StatsLine surface. The schedule overlay no longer activates reminders by itself; the default Web tree already does. Future host-plane tool additions must update `shipped-composition` and any minimal-preset tool inventory in the same change.

## Testing

`DSH_SNAPSHOT=replay pnpm run test:web` is the acceptance gate. Focused coverage for this baseline includes `schedule-after.e2e.ts`, `shipped-composition.e2e.ts`, `minimal-preset.snapshot.ts`, `built-boot.snapshot.ts`, `plugin-config.e2e.ts`, and `trajectory-virtualization.e2e.ts`.
