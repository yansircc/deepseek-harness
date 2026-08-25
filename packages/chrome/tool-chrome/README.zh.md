# @deepseek-ai/dsh-tool-chrome

[English](README.md) | 中文

Model-facing Consumer for the `ctx.chrome` capability. It registers 27 atomic `chrome_*` commands plus `chrome_status`, projects validated tool arguments onto the shared closed protocol union, requires an initiating Agent, and forwards the exact tool cancellation signal to the selected Chrome provider.

The package owns model schemas, descriptions, argument compatibility projection, and JSON presentation. It does not own bridge sockets, credentials, connector leases, extension assets, Web routes, or settings.

## Model Experience

### Chrome tools

#### What the model sees

The model sees `chrome_status` and the 27 atomic tab, page, input, screenshot, network, and automation-ownership tools. The package adds no system-prompt section.

#### Token effect

All mounted Chrome tool schemas are present on every request; there is no per-tool switch.

#### KV Cache effect

The tool prefix is stable while the Consumer stays mounted. Provider reconnects and operation revisions do not change model schemas.

## Known Limitations and Deferred Work

- Screenshot results currently remain bounded JSON from the provider. Workspace binary artifact persistence requires a binary-write filesystem or attachment Consumer; this package deliberately does not bypass `ctx.fs` with ambient Node filesystem writes.
