# @deepseek-ai/dsh-chrome-local

Local Service Provider for [`@deepseek-ai/dsh-chrome`](../chrome/README.md). It binds a loopback-only HTTP listener for one authenticated Chrome extension connector and submits model commands directly to its in-process command broker; DSH never calls its own listener as an owner client.

## Configuration

`host` accepts loopback names only. `port`, `commandTimeoutMs`, `connectorLeaseMs`, `pollWaitMs`, and `maxAdmittedCommands` are bounded safe integers. `ownerCredentialRef` defaults to `DSH_CHROME_OWNER_CREDENTIAL`; the provider reads the legacy name once and pins or generates the process credential before binding.

## Semantics

Provider startup binds before publication and rejects load on failure. One proof-complete connector owns the slot. Queued cancellation prevents delivery; cancellation after claim reports unknown outcome and emits a connector cancel intent. May-mutate commands are never replayed. Late results are acknowledged and retained for diagnosis. Disposal stops admission, settles queued/delivered work with distinct outcomes, closes sockets, and waits for quiescence.

## Model Experience

This provider registers no model tools or prompt text. [`@deepseek-ai/dsh-tool-chrome`](../../extensions/tool-chrome/README.md) remains the Consumer during migration.

## Known Limitations and Deferred Work

The current connector handshake adapter preserves the installed extension's single-request metadata flow; the authored-extension integration slice will replace the proof-complete placeholder with the shared two-step kernel handshake. Status and extension-download Web routes remain in the legacy package until the Web adapter migration.
