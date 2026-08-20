# @deepseek-ai/dsh-tool-zeroy

English | [中文](README.zh.md)

Model-facing zeroY WordPress site management tools for DeepSeek Harness.

## Overview

This plugin lets a DSH Agent manage remote WordPress sites through the zeroY Connector API. It exposes five tools:

| Tool | Description |
|------|-------------|
| `zeroy_inspect` | Read typed Connector resources (sites, refs, commits, releases, proofs, integrity, external checks) |
| `zeroy_checkout` | Materialize a remote SiteCommit as a local Git-backed working tree |
| `zeroy_push` | Upload objects, create immutable commits, and create administrator-only PreviewReleases |
| `zeroy_pair` | Bind a WordPress site via two-step pairing flow |
| `zeroy_unpair` | Unbind a WordPress site and revoke its grant |

## Architecture

```
Agent → zeroy_* tools → Connector REST API → WordPress + zeroY Plugin
                ↕
    ctx.credentials (grant secrets)
    ctx.settings    (site metadata)
```

- **Secrets** live in `$DSH_HOME/.credentials.yaml` via `@deepseek-ai/dsh-credentials-local`
- **Site metadata** lives in DSH settings under the `zeroy-sites` namespace
- **File bytes never enter tool arguments** — the Agent edits the local checkout with ordinary file tools
- **Push never activates the public site** — only an administrator can publish a proof-ready PreviewRelease

## Configuration

```yaml
# cordis.yml
- id: tool-zeroy
  name: '@deepseek-ai/dsh-tool-zeroy'
  config:
    inspect: true      # register zeroy_inspect (default: true)
    checkout: true     # register zeroy_checkout (default: true)
    push: true         # register zeroy_push (default: true)
    pairing: true      # register zeroy_pair + zeroy_unpair (default: true)
```

## Binding a Site

### Interactive (Agent-driven)

1. Agent calls `zeroy_pair({ endpoint: "https://example.com", label: "My Site" })`
2. Tool returns an `intentId` and instructions
3. User creates a pairing code in WP admin → zeroY Connections page
4. Agent calls `zeroy_pair({ endpoint, label, intentId, code: "ABC123" })`
5. Grant secret is stored securely; site metadata is persisted

### Headless / CI

Set environment variables:

```bash
ZEROY_SITES='[{"siteId":"my-site","label":"My Site","endpoint":"https://example.com","connectionKey":"legacy-key"}]'
```

Or pre-populate `$DSH_HOME/.credentials.yaml`:

```yaml
ZEROY_SITE_MY_SITE: "grant-secret-value"
```

## Multi-Site Support

Multiple sites are supported. Each site has its own credential ref and metadata entry. Tools route by `siteId`:

```
zeroy_inspect({ resource: "sites" })                    → list all bound sites
zeroy_inspect({ siteId: "site-a", resource: "current" }) → inspect specific site
zeroy_checkout({ siteId: "site-b", source: "active-release" }) → checkout site B
```

## Checkout Layout

```
.zeroy-checkouts/<label>-<checkoutId>/
├── site.json
├── artifacts/theme/
├── artifacts/site-logic/
├── content/posts/<collection>/<ref>.json
├── content/terms/<taxonomy>/<ref>.json
├── locales/<locale>/...
├── media/
└── .zeroy/              ← derived projection (read-only)
    ├── checkout.json
    ├── README.md
    ├── brief.json
    └── review.json
```

## Dependencies

- `@deepseek-ai/dsh-credentials` — credential resolution seam
- `@deepseek-ai/dsh-settings` — site metadata persistence
- `@sinclair/typebox` — input schema validation (kept from original zeroY)
- Node.js built-ins: `fs/promises`, `child_process`, `crypto`, `path`

## Origin

Ported from [pipee zeroY extension](https://github.com/yansircc/pipee/tree/main/extensions/zeroy). The domain logic (object hashing, merge, browser verification) is preserved; the Pi/Effect-TS adapter layer is replaced with DSH-native async/await patterns.

## Model Experience

### Tool schemas

#### What the model sees

The generated [`zeroy_inspect`, `zeroy_checkout`, `zeroy_push`, `zeroy_pair`, and `zeroy_unpair` schemas](../../../docs/tool-catalog.md#deepseek-aidsh-tool-zeroy). Config flags `inspect`, `checkout`, `push`, and `pairing` omit the corresponding tools at load; pairing covers both `zeroy_pair` and `zeroy_unpair`.

#### Token effect

Each config-enabled tool schema is present on every request. Toggling a flag adds or removes that schema.

#### KV Cache effect

Prefix-stable while the enabled-tool set is unchanged. Flipping a config flag or unloading the plugin changes the tool prefix.

## Known Limitations and Deferred Work

- **Push never activates the public site** — only an administrator can publish a proof-ready PreviewRelease in WordPress.
- **File bytes never enter tool arguments** — the agent edits the local checkout with ordinary file tools, then `zeroy_push` reads that tree.
- **Browser pairing needs the Host web server** — without it, only the two-step `zeroy_pair` tool flow remains.
