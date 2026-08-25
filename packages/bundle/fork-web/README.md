# `@deepseek-ai/dsh-fork-web`

English | [中文](README.zh.md)

Fork-owned browser-surface layer over [`dsh-web-app`](../web-app/README.md): [`cordis.patch.yml`](cordis.patch.yml) inserts workspace git sampling and chrome, session tool-call stats, Schedule plus time context, and the zeroY/Chrome settings cards, then disables the Host-plane `tool-list-models` row from [`dsh-fork-base`](../fork-base/README.md) so agent presets own that tool. The default web Profile template applies this bundle immediately after `dsh-web-app`. Upstream `dsh-web-app` does not mount these rows. The package has no runtime API; the profile composer resolves the patch through the `dsh.bundle.patch` manifest field.

## Model Experience

Indirectly, through the inserted Host rows: Schedule registers model-facing reminder tools on root agents; time context contributes request context. Client UI rows register nothing model-facing.

#### KV Cache effect

None directly for the UI rows; Schedule and time-context packages own their effects.

## Known Limitations and Deferred Work

- **A patch replaces whole row configs** — profile overrides must restate every field a row keeps; there is no deep-merge layer.
- **Requires the preceding fork-base layer for list-models disable** — without `tool-list-models` already present, the disable entry is inert.
