/**
 * Schedule strip copy: dictionary keys are the single source of the
 * `schedule` locale namespace (see the LocaleNamespaceMap merge in
 * ./index.ts). Key names intentionally stay stable across languages.
 */

/** The dictionary keys of the `schedule` namespace. */
export type ScheduleKey = keyof typeof zh

/** Dictionary namespace owned by this plugin. */
export const NS = 'schedule'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'reminders': '提醒',
  'paused.count': '{count} 个已暂停',
  'expand': '展开',
  'collapse': '收起',
  'overdue': '已到期',
  'due.in': '{countdown} 后',
  'paused': '已暂停',
  'kind.after': '延时',
  'kind.at': '定时',
  'kind.every': '周期',
  'kind.cron': 'Cron',
  'every.seconds': '每 {count} 秒',
  'every.minutes': '每 {count} 分钟',
  'cron.rule': '{expression} · {zone}',
  'list.aria': '当前会话的提醒列表',
  'seconds': '{count} 秒',
  'minutes': '{count} 分钟',
  'hours': '{count} 小时',
  'days': '{count} 天',
} satisfies Record<string, string>

/** English dictionary; keys must match {@link zh}. */
export const en = {
  'reminders': 'Reminders',
  'paused.count': '{count} paused',
  'expand': 'Expand',
  'collapse': 'Collapse',
  'overdue': 'Overdue',
  'due.in': 'in {countdown}',
  'paused': 'Paused',
  'kind.after': 'Delay',
  'kind.at': 'At',
  'kind.every': 'Every',
  'kind.cron': 'Cron',
  'every.seconds': 'every {count}s',
  'every.minutes': 'every {count}m',
  'cron.rule': '{expression} · {zone}',
  'list.aria': 'Reminders for the current session',
  'seconds': '{count}s',
  'minutes': '{count}m',
  'hours': '{count}h',
  'days': '{count}d',
} satisfies Record<string, string>
