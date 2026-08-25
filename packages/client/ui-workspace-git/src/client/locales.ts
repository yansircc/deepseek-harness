/** `workspaceGit` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'workspaceGit'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'settings.git.title': '工作区 Git',
  'settings.git.description': '控制会话页头的工作区 Git 信息。增删行相对 HEAD，不是本会话的改动',
  'settings.git.showGitBranch': '当前分支',
  'settings.git.showGitDirty': '脏文件数',
  'settings.git.showGitUpstream': '相对上游',
  'settings.git.showGitDiffstat': '增删行',
  'git.detached': 'HEAD {sha}',
  'git.diffstatHint': '相对 HEAD 的工作区增删行，不是本会话的改动',
  'git.aria': '工作区 Git',
} as const

/** English dictionary; keys must match `zh`. */
export const en: { [K in keyof typeof zh]: string } = {
  'settings.git.title': 'Workspace Git',
  'settings.git.description': 'Choose which workspace Git facts appear in the session header. Added and deleted lines are versus HEAD, not this conversation',
  'settings.git.showGitBranch': 'Current branch',
  'settings.git.showGitDirty': 'Dirty file count',
  'settings.git.showGitUpstream': 'Versus upstream',
  'settings.git.showGitDiffstat': 'Added and deleted lines',
  'git.detached': 'HEAD {sha}',
  'git.diffstatHint': 'Working-tree added and deleted lines versus HEAD, not this conversation',
  'git.aria': 'Workspace Git',
}

/** Locale key owned by the workspace-git dictionaries. */
export type WorkspaceGitKey = keyof typeof zh
