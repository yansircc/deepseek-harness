/** Locale bundles for the Chrome control configuration card. */

/** Dictionary namespace owned by this card plugin. */
export const NS = 'settings.chrome'

/** Locale keys the Chrome card renders. */
export type ChromeLocaleKey =
  | 'title' | 'description' | 'expand' | 'collapse' | 'readOnly'
  | 'statusTitle' | 'statusReady' | 'statusNotConfigured'
  | 'guideTitle' | 'guideLine1' | 'guideLine2' | 'guideLine3'
  | 'installTitle' | 'installStep1' | 'installStep2' | 'installStep3'
  | 'settingsTitle' | 'portLabel' | 'portHint' | 'credentialLabel' | 'credentialHint'
  | 'overridden' | 'reset' | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed'

/** English copy. */
export const en: Record<ChromeLocaleKey, string> = {
  title: 'Chrome control',
  description: 'Let the agent use your open Chrome with your logged-in sessions.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  readOnly: 'This deployment stores settings read-only.',
  statusTitle: 'Status',
  statusReady: 'Chrome control is set up.',
  statusNotConfigured: 'Chrome control is not set up yet.',
  guideTitle: 'What can the agent do?',
  guideLine1: 'The agent can open, switch, and close your Chrome tabs, click and type on pages, fill forms, take screenshots, and more — using your logged-in sessions, so sites that need sign-in just work.',
  guideLine2: 'The agent works in its own browser space, so your own browsing is not disturbed.',
  guideLine3: 'You stay in control: the agent only acts on what you ask it to do.',
  installTitle: 'To enable Chrome control',
  installStep1: 'Open the extension page: type chrome://extensions in your Chrome address bar and press Enter.',
  installStep2: 'Turn on "Developer mode" (top right).',
  installStep3: 'Click "Load unpacked" and select the folder containing the Chrome extension files.',
  settingsTitle: 'Settings',
  portLabel: 'Local service port',
  portHint: 'The local service Chrome connects to. Leave the default unless it conflicts with another program.',
  credentialLabel: 'Credential name',
  credentialHint: 'The stored connection secret name. Ask the agent for the exact value.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values.',
}

/** 简体中文 copy. */
export const zh: Record<ChromeLocaleKey, string> = {
  title: 'Chrome 自动化',
  description: '让 agent 使用你已登录的 Chrome 标签页。',
  expand: '显示设置',
  collapse: '收起设置',
  readOnly: '此部署只读存储设置。',
  statusTitle: '状态',
  statusReady: 'Chrome 自动化已就绪。',
  statusNotConfigured: 'Chrome 自动化尚未配置。',
  guideTitle: 'agent 能做什么？',
  guideLine1: 'agent 可以打开、切换和关闭你的 Chrome 标签页，在页面上点击、输入、填写表单、截图等——使用你已登录的会话，需要登录的网站也能直接操作。',
  guideLine2: 'agent 在独立的浏览器空间工作，不会打扰你自己的浏览。',
  guideLine3: '你始终掌握控制权：agent 只做你要求的事。',
  installTitle: '如何启用 Chrome 自动化',
  installStep1: '打开扩展页面：在 Chrome 地址栏输入 chrome://extensions 并回车。',
  installStep2: '打开右上角的“开发者模式”。',
  installStep3: '点击“加载已解压的扩展程序”，选择包含 Chrome 扩展文件的文件夹。',
  settingsTitle: '设置',
  portLabel: '本地服务端口',
  portHint: 'Chrome 连接的本地服务端口。除非与其它程序冲突，否则保持默认即可。',
  credentialLabel: '凭证名称',
  credentialHint: '存储的连接密钥名称。请向 agent 询问确切值。',
  overridden: '已覆盖',
  reset: '恢复默认',
  save: '保存',
  saving: '保存中…',
  discard: '放弃',
  unsaved: '未保存',
  saveFailed: '部署未接受这些值。',
}
