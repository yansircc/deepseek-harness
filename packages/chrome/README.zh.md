# chrome/ — signed-in Chrome capability

[English](README.md) | 中文

The Chrome capability family separates provider-neutral command ownership, local connector transport, authored browser code, and model-facing Consumers.

| Package | Role | ctx key |
|---|---|---|
| [`chrome-protocol/`](chrome-protocol/README.zh.md) | Executable command, result, revision, and health vocabulary shared across peers | none |
| [`chrome/`](chrome/README.zh.md) | Exact-Agent Cordis Service Definition and provider lifecycle | `ctx.chrome` |
| [`chrome-local/`](chrome-local/README.zh.md) | Loopback connector, authenticated single slot, abort-aware command store, and process lifecycle | registers on `ctx.chrome` |
| [`chrome-extension/`](chrome-extension/README.zh.md) | Authored Manifest V3 connector source, deterministic build, and committed browser artifact | none; loaded by Chrome |

Chrome remains a host-plane capability because its local provider owns process-wide browser connector state. The model-facing tools and Web settings card are separate Consumers.

- [`tool-chrome/`](tool-chrome/README.zh.md) — model-facing 28-tool Consumer.
- [`chrome-local-web/`](chrome-local-web/README.zh.md) — Web health and extension artifact adapter.
