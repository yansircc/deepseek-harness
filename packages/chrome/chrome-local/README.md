# @deepseek-ai/dsh-chrome-local

English | [中文](README.zh.md)

Local Service Provider for [`@deepseek-ai/dsh-chrome`](../chrome/README.md). It binds a loopback-only HTTP listener for one authenticated Chrome extension connector and submits model commands directly to its in-process command broker; DSH never calls its own listener as an owner client.

## Configuration

`host` accepts loopback names only. `port`, `commandTimeoutMs`, `connectorLeaseMs`, `pollWaitMs`, and `maxAdmittedCommands` are bounded safe integers. `ownerCredentialRef` defaults to `DSH_CHROME_OWNER_CREDENTIAL`; the provider reads the legacy name once and pins or generates the process credential before binding.

## Semantics

Provider startup binds before publication and rejects load on failure. One proof-complete connector owns the slot. Queued cancellation prevents delivery; cancellation after claim reports unknown outcome and emits a connector cancel intent. May-mutate commands are never replayed. Late results are acknowledged and retained for diagnosis. Disposal stops admission, settles queued/delivered work with distinct outcomes, closes sockets, and waits for quiescence.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-chrome`, which owns the model-facing schemas and result rendering.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- The connector transport remains single-profile and loopback-only; failed compatibility checks reject the connector.
