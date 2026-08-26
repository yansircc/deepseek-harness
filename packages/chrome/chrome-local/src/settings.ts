/** User-configurable startup settings for the local Chrome provider. */
import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { Config, resolveConfig, type ResolvedConfig } from './config.ts'

/** Settings namespace consumed by the Chrome setup card. */
export const CHROME_SETTINGS_NAMESPACE = settingsNamespace('chrome-local')

/** Register provider config so the Web Plugins tab can render and persist it. */
export function registerChromeSettings(ctx: Context, entry: Config): void {
  const resolved: ResolvedConfig = resolveConfig(entry)
  installSettingsSection(ctx, CHROME_SETTINGS_NAMESPACE, Config, resolved, {
    setSource: () => {},
    onChange: () => {},
    validate: (value) => { resolveConfig(value) },
  })
}
