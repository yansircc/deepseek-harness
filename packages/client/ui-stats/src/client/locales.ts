/** `conversationStats` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'conversationStats'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'stats.counts': '{turns} 轮 · {steps} 步',
  'stats.llm': 'LLM {duration}',
  'stats.toolCall': '工具 {count}次 {duration}',
  'stats.ttftAverage': '首 token 平均 {duration}',
  'stats.tokensPerSecond': '{throughput} tok/s',
  'stats.cacheHit': '缓存命中 {percent}%',
  'stats.tokens': '未缓存 {uncached} · 输入 {input} · 输出 {output}',
  'settings.stats.title': '统计行',
  'settings.stats.description': '控制对话底部统计行的分组；没有数据的分组仍会隐藏',
  'settings.stats.showStatsCounts': '轮次与步数',
  'settings.stats.showStatsDurations': '模型与工具耗时',
  'settings.stats.showStatsLatency': '延迟与吞吐',
  'settings.stats.showStatsCacheHit': '缓存命中',
  'settings.stats.showStatsTokens': 'Token 账目',
} as const

/** English dictionary; keys must match `zh`. */
export const en: { [K in keyof typeof zh]: string } = {
  'stats.counts': '{turns} turns · {steps} steps',
  'stats.llm': 'LLM {duration}',
  'stats.toolCall': 'Tools {count}× {duration}',
  'stats.ttftAverage': 'TTFT avg {duration}',
  'stats.tokensPerSecond': '{throughput} tok/s',
  'stats.cacheHit': 'Cache hit {percent}%',
  'stats.tokens': 'Uncached {uncached} · Input {input} · Output {output}',
  'settings.stats.title': 'Stats line',
  'settings.stats.description': 'Choose which groups appear on the conversation stats line; empty groups still hide',
  'settings.stats.showStatsCounts': 'Turns and steps',
  'settings.stats.showStatsDurations': 'Model and tool time',
  'settings.stats.showStatsLatency': 'Latency and throughput',
  'settings.stats.showStatsCacheHit': 'Cache hit',
  'settings.stats.showStatsTokens': 'Token account',
}

/** Locale key owned by the stats dictionaries. */
export type ConversationStatsKey = keyof typeof zh
