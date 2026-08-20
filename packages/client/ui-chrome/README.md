# @deepseek-ai/dsh-client-ui-chrome

English | [中文](README.zh.md)

Browser settings card for the Chrome bridge. It occupies the shared `settings.plugin.item` slot under the `tool-chrome` namespace: setup status, extension download, and the advanced port field. The Host [`@deepseek-ai/dsh-tool-chrome`](../../extensions/tool-chrome/README.md) plugin owns the bridge, the owner credential, and every model-facing `chrome_*` tool.

```yaml
- id: ui-chrome
  name: '@deepseek-ai/dsh-client-ui-chrome'
```

## Model Experience

None, as the card only edits host settings and never touches a prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **The card does not start Chrome** — it reports bridge status and serves the extension zip; the operator still loads the unpacked extension in a real Chrome profile.
- **Port changes apply on the next Host restart** — the running bridge keeps the listen port it started with.
