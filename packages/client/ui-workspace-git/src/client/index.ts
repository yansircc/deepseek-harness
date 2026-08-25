/**
 * Workspace-git UI plugin, browser half: session-header chrome and the
 * General Settings display-preference row. Sampling uses the Host
 * `workspaceGit.sample` Remote and never writes to the session log.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (header.utilities).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls settings SlotMap (settings.general.item) and settingsScope.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { WorkspaceGitDisplayPolicy } from './display-policy.ts'
import { GitDisplayRow } from './GitDisplayRow.tsx'
import type { GitDisplayRowInjected } from './GitDisplayRow.tsx'
import { WorkspaceGitChip } from './WorkspaceGitChip.tsx'
import type { WorkspaceGitChipInjected } from './WorkspaceGitChip.tsx'
import { en, NS, zh, type WorkspaceGitKey } from './locales.ts'
import {
  WORKSPACE_GIT_SETTINGS_NAMESPACE, type WorkspaceGitSettings,
} from '../git-display-settings.ts'
import type { WorkspaceGitRemoteFace, WorkspaceGitSample } from './sample-status.ts'

export type { GitDisplayRowInjected, GitDisplayRowProps } from './GitDisplayRow.tsx'
export type { WorkspaceGitChipInjected, WorkspaceGitChipProps } from './WorkspaceGitChip.tsx'
export type { WorkspaceGitKey } from './locales.ts'
export type { WorkspaceGitRemoteFace, WorkspaceGitSample } from './sample-status.ts'
export type {
  WorkspaceGitDisplayField, WorkspaceGitDisplayPreferences, WorkspaceGitSettings,
} from '../git-display-settings.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Workspace-git header chrome and General Settings copy. */
    workspaceGit: WorkspaceGitKey
  }
}

/** Required services for the header chip, settings row, sample Remote, and copy. */
export const inject = ['slots', 'locale', 'remote', 'remote.workspaceGit', 'settingsScope']

/**
 * Client plugin body: header utilities chip and General Settings toggles.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace-git: dictionaries')

  const settingsScope = ctx.settingsScope.bind<WorkspaceGitSettings>({
    namespace: WORKSPACE_GIT_SETTINGS_NAMESPACE,
  })
  const displayPolicy = new WorkspaceGitDisplayPolicy(settingsScope)
  const displayInject = (): GitDisplayRowInjected => ({
    hooks: { display: displayPolicy.prefs },
    setDisplay: (field, value) => { displayPolicy.set(field, value) },
  })

  const workspaceGit = ctx.get('remote.workspaceGit') as WorkspaceGitRemoteFace
  const sampleGit = async (path: string, signal?: AbortSignal): Promise<WorkspaceGitSample> => {
    const result = signal === undefined
      ? await workspaceGit.sample(path)
      : await workspaceGit.sample(path, signal)
    return result.ok ? result.value : { present: false }
  }

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'git-display',
    order: 40,
    locale: NS,
    inject: displayInject,
  }, GitDisplayRow))

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities',
    id: 'workspace-git',
    order: 0,
    locale: NS,
    inject: (): WorkspaceGitChipInjected => ({
      hooks: { display: displayPolicy.prefs },
      sampleGit,
    }),
  }, WorkspaceGitChip))
}
