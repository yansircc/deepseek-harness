# `@deepseek-ai/dsh-fork-base`

English | [中文](README.zh.md)

Fork-owned Host tool layer over [`dsh-base`](../base/README.md): [`cordis.patch.yml`](cordis.patch.yml) inserts `tool-list-models`, `tool-zeroy`, and `tool-chrome`. The default web and headless Profile templates apply this bundle immediately after `dsh-base`. Upstream `dsh-base` does not mount these rows. The optional Cursor provider stays a separate installable Bundle ([`dsh-subagent-cursor`](../../subagent/subagent-cursor/README.md)); this package does not depend on or mount it. The package has no runtime API; the profile composer resolves the patch through the `dsh.bundle.patch` manifest field.

## Model Experience

Indirectly, through the inserted rows: each tool package owns its model-visible schemas and results. This bundle contributes no model-visible text of its own.

#### KV Cache effect

None directly; each inserted row's package owns its effect.

## Known Limitations and Deferred Work

- **A patch replaces whole row configs** — profile overrides must restate every field a row keeps; there is no deep-merge layer.
- **Web disables `tool-list-models` on the Host plane** — [`dsh-fork-web`](../fork-web/README.md) turns the Host row off so agent presets own the catalog tool.
