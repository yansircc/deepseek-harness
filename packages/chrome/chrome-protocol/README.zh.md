# @deepseek-ai/dsh-chrome-protocol

[English](README.md) | 中文

Executable, provider-neutral Chrome command vocabulary shared by DSH host providers and browser connectors. It owns closed operation unions, opaque identifiers, command effects, lifecycle phases, protocol revisions, health, and result errors. Transport authentication and model-facing tool registration belong to consumers and providers.

## Model Experience

None, as this is a provider-neutral protocol package and it registers no model-facing tool or prompt section.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- Kernel compatibility intentionally rejects incompatible peers instead of carrying pre-release shims.
