# @deepseek-ai/dsh-tool-chrome

English | [中文](README.zh.md)

Control a real signed-in Chrome profile from DeepSeek Harness through a local bridge + browser extension.

## Overview

This plugin lets a DSH agent drive the user's existing Chrome (with its logins, cookies, and session) through 25 atomic `chrome_*` tools plus `chrome_status`. The local Chrome bridge is native to DSH — no external runtime.

```
┌────────────────────────────────────────────────┐
│ DSH (this plugin)                              │
│  25 × chrome_* tools + chrome_status            │
│  BridgeServer (node:http, owner auth via HMAC)  │
└──────────────┬─────────────────────────────────┘
               │ localhost HTTP (default 17318)
┌──────────────▼─────────────────────────────────┐
│ Chrome Extension (load unpacked)               │
│  chrome.debugger API → real browser            │
└────────────────────────────────────────────────┘
```

## Architecture

| Piece | Implementation | Notes |
|-------|---------------|-------|
| `src/bridge/server.ts` | `node:http` server | Owner (DSH) + connector (extension) routes, HMAC auth |
| `src/bridge/broker.ts` | Promise-based command mailbox | Owner send / connector poll / complete |
| `src/bridge/owner-client.ts` | async owner client | Handshake + authenticated command forwarding |
| `src/protocol/*` | Pure TS + JSON | Bridge contract, HMAC proofs, protocol fingerprint |
| `src/protocol/operations.ts` | 25 tool descriptors | Names and descriptions the model sees |
| Chrome Extension | `assets/browser-extension/` | Download zip substitutes this plugin's bridge port |

## Setup

### 1. Load the Chrome extension

Download the extension zip from the Chrome settings card — it substitutes this plugin's bridge port into `assets/browser-extension/` — or load that directory unpacked after the same substitution.

Then in Chrome, open `chrome://extensions`, enable Developer mode, and **Load unpacked** the unzipped directory.

### 2. Configure the owner credential

The bridge authenticates DSH as its owner via a shared secret. Store it in DSH credentials:

```yaml
# $DSH_HOME/.credentials.yaml
DSH_CHROME_OWNER_CREDENTIAL: "<64-hex-char secret>"
```

Or set the environment variable `DSH_CHROME_OWNER_CREDENTIAL`.

The same secret must match the extension's expectation. The protocol fingerprint defaults to the shipped v1 fingerprint so the bundled extension works. Override via config if you rebuild with a different protocol.

### 3. Register the plugin

```yaml
# cordis.yml
- id: tool-chrome
  name: '@deepseek-ai/dsh-tool-chrome'
  config:
    port: 17318          # must match the extension's --bridge-url port
    commandTimeoutMs: 30000
```

## Tools

| Tool | Purpose |
|------|---------|
| `chrome_status` | Bridge + extension status (ready / waiting-for-extension / offline) |
| `chrome_tab_list` / `new` / `activate` / `close` / `group` / `ungroup` | Tab management |
| `chrome_snapshot` | Action Graph of the page, with fresh refs for actions |
| `chrome_read` / `inspect` | Read rendered content, inspect an element |
| `chrome_navigate` / `evaluate` / `wait` / `console` / `network_list` / `network_get` | Page control |
| `chrome_screenshot` | Viewport or full-page tile capture |
| `chrome_click` / `type` / `fill` / `press` / `hover` / `drag` / `tap` / `scroll` / `upload` | Real Chrome input |

## Design

- **Plain Node HTTP**: the bridge is `node:http` + Promises; the only crypto dependency is `node:crypto`.
- **DSH-native lifecycle**: the bridge starts in the plugin's `apply()` and stops on fiber disposal.
- **Credentials via `ctx.credentials`**: the owner secret never appears in code or logs.
- **Protocol compatibility**: the fingerprint is a version tag; set `protocolFingerprint` in config to declare which extension protocol version this bridge speaks (defaults to the shipped v1 fingerprint `593fb1f9…`).

## Model Experience

### Tool schemas

#### What the model sees

The generated [`chrome_status` and `chrome_*` schemas](../../../docs/tool-catalog.md#deepseek-aidsh-tool-chrome). Descriptions and JSON parameters are the catalog text; this package adds no extra system-prompt section.

#### Token effect

Each registered tool schema is present on every request while the plugin is mounted. There is no per-tool config switch.

#### KV Cache effect

Prefix-stable while the plugin stays mounted. Loading or unloading the plugin changes the tool prefix.

## Known Limitations and Deferred Work

- **The bridge needs a real Chrome profile** — without the loaded extension, every `chrome_*` call fails after `chrome_status` reports `waiting-for-extension` or `offline`.
- **Owner credential generation is process-local when storage is missing** — a generated secret that never reached `ctx.credentials` does not survive restart.
- **Screenshots write into the process cwd** — the tool result points at those files; they are not session-log attachments.
