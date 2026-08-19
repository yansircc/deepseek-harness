/** Locale bundles for the Chrome control configuration card. */

/** Dictionary namespace owned by this card plugin. */
export const NS = 'settings.chrome'

/** Locale keys the Chrome card renders. */
export type ChromeLocaleKey =
  | 'title' | 'description' | 'expand' | 'collapse' | 'readOnly'
  | 'statusTitle' | 'statusReady' | 'statusNotConfigured'
  | 'guideTitle' | 'guideLine1' | 'guideLine2' | 'guideLine3'
  | 'installTitle' | 'downloadButton' | 'downloadHint' | 'installStep1' | 'installStep2' | 'installStep3'
  | 'credentialAuto' | 'settingsTitle' | 'portLabel' | 'portHint'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed'

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
  installTitle: 'Enable Chrome control in 3 steps',
  downloadButton: 'Download the extension',
  downloadHint: 'Download the extension package, then follow the steps below.',
  installStep1: 'Download the extension (button above).',
  installStep2: 'Open chrome://extensions and turn on "Developer mode" (top right).',
  installStep3: 'Drag the downloaded ZIP directly onto the page, or extract it and use "Load unpacked".',
  credentialAuto: 'Connection is automatic: the secret is generated and stored for you — nothing to configure.',
  settingsTitle: 'Advanced',
  portLabel: 'Local service port',
  portHint: 'The local service Chrome connects to. Leave the default unless it conflicts with another program.',
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
  installTitle: '三步启用 Chrome 自动化',
  downloadButton: '下载扩展',
  downloadHint: '先下载扩展包，再按下面的步骤安装。',
  installStep1: '下载扩展（点击上方按钮）。',
  installStep2: '打开 chrome://extensions 并开启右上角的“开发者模式”。',
  installStep3: '把下载的 ZIP 直接拖到页面，或解压后用“加载已解压的扩展程序”。',
  credentialAuto: '连接是自动的：密钥已为你生成并安全存储，无需任何配置。',
  settingsTitle: '高级',
  portLabel: '本地服务端口',
  portHint: 'Chrome 连接的本地服务端口。除非与其它程序冲突，否则保持默认即可。',
  save: '保存',
  saving: '保存中…',
  discard: '放弃',
  unsaved: '未保存',
  saveFailed: '部署未接受这些值。',
}
