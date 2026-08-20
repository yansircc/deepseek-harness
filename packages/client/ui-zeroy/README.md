# @deepseek-ai/dsh-client-ui-zeroy

English | [中文](README.zh.md)

Browser settings card for bound zeroY WordPress sites. It occupies the shared `settings.plugin.item` slot under the `zeroy-sites` namespace and drives one-click browser pairing. The Host [`@deepseek-ai/dsh-tool-zeroy`](../../extensions/tool-zeroy/README.md) plugin owns site credentials, pairing routes, and every model-facing `zeroy_*` tool.

```yaml
- id: ui-zeroy
  name: '@deepseek-ai/dsh-client-ui-zeroy'
```

## Model Experience

None, as the card only edits host settings and never touches a prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Pairing needs the Host web server** — without it the card cannot finish the OAuth callback, and the operator falls back to the tool-driven `zeroy_pair` flow.
- **The card does not publish a site** — push creates administrator-only preview releases; public activation stays in WordPress.
