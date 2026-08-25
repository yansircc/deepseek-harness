# @deepseek-ai/dsh-chrome

English | [中文](README.zh.md)

Owner-scoped Chrome automation capability seam. The service accepts closed provider-neutral commands for an exact initiating Agent, forwards the caller's required `AbortSignal`, publishes one provider only after successful startup, and awaits provider close during disposal.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-chrome`, which owns the model-facing schemas and result rendering.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- The service supports exactly one provider; provider selection is deferred until a second production provider exists.
