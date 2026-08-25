# @deepseek-ai/dsh-chrome

Owner-scoped Chrome automation capability seam. The service accepts closed provider-neutral commands for an exact initiating Agent, forwards the caller's required `AbortSignal`, publishes one provider only after successful startup, and awaits provider close during disposal.

## Model Experience

This package is a Service Definition and does not register model-facing tools. `@deepseek-ai/dsh-tool-chrome` owns tool names, schemas, descriptions, and result presentation.

## Known Limitations and Deferred Work

The local HTTP/HMAC bridge provider and runtime wire decoders remain in the legacy Chrome package until their migration slice lands. Dynamic page-program revisions and cancellation transport are represented by the protocol package but are not yet implemented by a provider.
