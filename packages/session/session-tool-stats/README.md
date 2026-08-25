# @deepseek-ai/dsh-session-tool-stats

English | [中文](README.zh.md)

Function plugin registering the `sessionToolStats` projection unit: the whole-log matched tool-call count folded from `tool/call` → `tool/result` pairs and served through the session-projection seam (registry snapshot, change feed, and every projection carrier: history tail page, `session/projection` push frames, session list rows). Clients render a full-session tool count that paging and compaction cannot change; the reference consumer is the web chat stats strip, which composes this unit with `sessionStats.toolMs` for the `Tools {count}× {duration}` group.

## Fold semantics

- `toolCalls` counts `tool/call` → `tool/result` pairs matched by callId. Unresolved calls are dropped at `turn/end` (results land within their turn) and do not increment the count. Orphan results with no preceding call are ignored.
- The count is 0 until its first matched pair. A composed registry always serves the key, so clients read the value, never key presence.
- Wall time stays on `sessionStats.toolMs`; this unit owns only the count so the upstream `sessionStats` package can stay free of the local count field.

## Composition

```yaml
- id: session-tool-stats
  name: '@deepseek-ai/dsh-session-tool-stats'
```

Injects `sessionProjections` — the plugin's whole purpose; in assemblies without the registry the fiber stays pending and nothing registers. Mount beside `@deepseek-ai/dsh-session-stats` when the consumer needs both duration and count.

## Model Experience

None, as the plugin only computes a client-facing read model of already-logged session events and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the plugin never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Counts are log-scoped, not surface-scoped** — tool pairs whose results were later compacted away stay counted; the figure describes the whole session, not the current model-visible surface.
- **Mounted only in the web-app bundle** — other assemblies serve no `sessionToolStats` key, and their consumers fall back to window-scoped counting (the web stats strip's fallback path).
