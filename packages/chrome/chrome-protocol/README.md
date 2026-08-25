# @deepseek-ai/dsh-chrome-protocol

Executable, provider-neutral Chrome command vocabulary shared by DSH host providers and browser connectors. It owns closed operation unions, opaque identifiers, command effects, lifecycle phases, protocol revisions, health, and result errors. Transport authentication and model-facing tool registration belong to consumers and providers.

## Model Experience

This package is not mounted as a model-facing plugin and contributes no tool schemas or prompt text.

## Known Limitations and Deferred Work

Runtime JSON decoding and canonical wire fingerprint generation move here as the local bridge provider migrates from the legacy `tool-chrome` package.
