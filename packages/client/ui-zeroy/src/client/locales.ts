/** Locale bundles for the zeroY sites configuration card. */

/** Dictionary namespace owned by this card plugin. */
export const NS = 'settings.zeroy'


/** Locale keys the zeroY card renders. */
export type ZeroYLocaleKey =
  | 'title' | 'description' | 'expand' | 'collapse' | 'readOnly'
  | 'guideTitle' | 'guideLine1' | 'guideLine2'
  | 'sitesTitle' | 'noSites' | 'remove' | 'removeConfirm'
  | 'addTitle' | 'labelLabel' | 'labelHint' | 'endpointLabel' | 'endpointHint'
  | 'credentialLabel' | 'credentialHint'
  | 'add' | 'adding' | 'addFailed'
  | 'overridden' | 'reset' | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed'

/** English copy. */
export const en: Record<ZeroYLocaleKey, string> = {
  title: 'zeroY Sites',
  description: 'Build and publish WordPress sites through the agent.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  readOnly: 'This deployment stores settings read-only.',
  guideTitle: 'What is zeroY?',
  guideLine1: 'zeroY lets the agent build and publish your WordPress site through a local Git checkout — theme, content, and translations, with each change reviewable before it goes live.',
  guideLine2: 'To bind a site, ask the agent to run zeroy_pair with your site URL and the pairing code from your WordPress admin. Bound sites appear below and can be managed here.',
  sitesTitle: 'Configured sites',
  noSites: 'No sites bound yet. Ask the agent to run zeroy_pair.',
  remove: 'Remove',
  removeConfirm: 'Remove this site?',
  addTitle: 'Add a site',
  labelLabel: 'Name',
  labelHint: 'A short label for this site, e.g. "My Company".',
  endpointLabel: 'Site URL',
  endpointHint: 'The WordPress site address, e.g. https://example.com',
  credentialLabel: 'Credential reference',
  credentialHint: 'The stored connection secret name. Ask the agent for the exact value after pairing.',
  add: 'Add site',
  adding: 'Adding…',
  addFailed: 'Could not add the site.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values.',
}

/** 简体中文 copy. */
export const zh: Record<ZeroYLocaleKey, string> = {
  title: 'zeroY 站点',
  description: '通过 agent 构建和发布 WordPress 站点。',
  expand: '显示设置',
  collapse: '收起设置',
  readOnly: '此部署只读存储设置。',
  guideTitle: '什么是 zeroY？',
  guideLine1: 'zeroY 让 agent 通过本地 Git 检出构建和发布你的 WordPress 站点——主题、内容和翻译，每次变更在发布前都可以审阅。',
  guideLine2: '要绑定站点，请让 agent 运行 zeroy_pair，并提供你的站点地址和 WordPress 后台的配对码。绑定后的站点会显示在下方，可在此管理。',
  sitesTitle: '已配置的站点',
  noSites: '尚未绑定站点。请让 agent 运行 zeroy_pair。',
  remove: '移除',
  removeConfirm: '确定移除这个站点？',
  addTitle: '添加站点',
  labelLabel: '名称',
  labelHint: '该站点的简短名称，例如“我的公司”。',
  endpointLabel: '站点地址',
  endpointHint: 'WordPress 站点地址，例如 https://example.com',
  credentialLabel: '凭证引用',
  credentialHint: '存储的连接密钥名称。配对后请向 agent 询问确切值。',
  add: '添加站点',
  adding: '添加中…',
  addFailed: '无法添加站点。',
  overridden: '已覆盖',
  reset: '恢复默认',
  save: '保存',
  saving: '保存中…',
  discard: '放弃',
  unsaved: '未保存',
  saveFailed: '部署未接受这些值。',
}
