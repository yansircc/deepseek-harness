# @deepseek-ai/dsh-client-ui-stats

English | [中文](README.zh.md)

Composer stats line and its General Settings display toggles. The line occupies the single `conversation.composer.dock` seat (`stats` family); the preference block occupies `settings.general.item` (`stats-display`, order 30). Counts and wall times compose `sessionStats` with `sessionToolStats.toolCalls` and `tokenUsage`; assemblies without `sessionStats` fall back to the window fold.

```yaml
- id: ui-stats
  name: '@deepseek-ai/dsh-client-ui-stats'
```

`StatsSettings` (`ui-stats` in `$DSH_HOME/settings.yaml`) carries five booleans — `showStatsCounts`, `showStatsDurations`, `showStatsLatency`, `showStatsCacheHit`, `showStatsTokens` — all default on. `StatsDisplayPolicy` owns the live record. All five flags off hide the line; a group with no data still hides itself when its flag is on. `@deepseek-ai/dsh-client-ui-conversation` declares the single dock seat and leaves it empty; omitting this plugin leaves the band blank. Prior on-disk `ui-conversation` stats flags are ignored until re-toggled under `ui-stats`.

## Model Experience

None, as the chrome folds already-logged session projections for the operator and never reaches a prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Prior `ui-conversation` stats flags are not migrated** — pre-release settings documents that stored the five flags under `ui-conversation` no longer apply; operators re-toggle under `ui-stats` if they had customized them.
- **Window fallback covers the loaded flow only** — without `sessionStats`, every figure folds the snapshot's assistant `timing` and tool pairs, so nodes outside the loaded event window are not counted.
