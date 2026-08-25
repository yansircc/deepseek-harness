type DshChromeConsoleMethod = 'debug' | 'log' | 'info' | 'warn' | 'error'

interface DshChromeConsoleEntry {
  id: number
  level: string
  timestamp: number
  url: string
  args: Array<unknown>
}

interface DshChromeNetworkEntry {
  id: string
  type: 'fetch' | 'xhr'
  method: string
  url: string
  startedAt: number
  pageUrl: string
  status: 'pending' | number
  statusText?: string | undefined
  ok?: boolean | undefined
  responseUrl?: string | undefined
  durationMs?: number | undefined
  responseHeaders?: Array<[string, string]> | undefined
  responseHeadersText?: string | undefined
  responseBody?: string | undefined
  responseBodyTruncated?: boolean | undefined
  responseBodyError?: unknown
  error?: unknown
}

interface DshChromePointerState {
  x: number
  y: number
  t: number
}

interface DshChromeSnapshotDigestLabel {
  uid: string
  role: string
  label: string
  disabled: boolean
  value?: string | undefined
  checked?: boolean | undefined
}

interface DshChromeSnapshotDigest {
  url: string
  title: string
  textHash: number
  focusedUid: string | null
  modalUid: string | null
  labels: Array<DshChromeSnapshotDigestLabel>
}

type DshChromeActionVerb = 'click' | 'fill' | 'press' | 'upload'

interface DshChromeElementRef {
  kind: 'element'
  element: Element
  verbs: Set<DshChromeActionVerb>
  context: boolean
}

interface DshChromeFrontierRef {
  kind: 'frontier'
  projection: 'actions' | 'content'
  rootUid: string | null
  offset: number
  fingerprint: number
  view?: 'content' | 'outline' | undefined
  query?: string | undefined
}

type DshChromeRegisteredRef = DshChromeElementRef | DshChromeFrontierRef

interface DshChromePageState {
  nextElementUid: number
  nextFrontierUid: number
  refs: Map<string, DshChromeRegisteredRef>
  console: Array<DshChromeConsoleEntry>
  network: Array<DshChromeNetworkEntry>
  nextRequestId: number
  instrumentationInstalled: boolean
  lastSnapshotDigest?: DshChromeSnapshotDigest | null | undefined
  pointer?: DshChromePointerState | undefined
}

interface Window {
  __DSH_CHROME_STATE__?: DshChromePageState
}

interface GlobalThis extends DshChromeInjectedGlobals {}

interface Element {
  __dshChromeUid?: string
}

interface Function {
  __dshChromeWrapped?: boolean
}

interface XMLHttpRequest {
  __dshChromeRequest?: {
    method?: string
    url?: string
  }
}

type DshChromeSnapshotPage = typeof import('./injected/snapshot-runtime.js').snapshotPage
type DshChromeReadPage = typeof import('./injected/snapshot-runtime.js').readPage
type DshChromeInspectTarget = typeof import('./injected/snapshot-runtime.js').inspectTarget
type DshChromeRememberElement = typeof import('./injected/action-core.js').rememberElement
type DshChromeGrantActionVerbs = typeof import('./injected/action-core.js').grantActionVerbs
type DshChromeMarkContextRef = typeof import('./injected/action-core.js').markContextRef
type DshChromeRegisterFrontier = typeof import('./injected/action-core.js').registerFrontier

type DshChromeInjectedGlobals = {
  __dshChromeSnapshotPage: undefined | DshChromeSnapshotPage
  __dshChromeReadPage: undefined | DshChromeReadPage
  __dshChromeInspectTarget: undefined | DshChromeInspectTarget
  __dshChromeRememberElement: undefined | DshChromeRememberElement
  __dshChromeGrantActionVerbs: undefined | DshChromeGrantActionVerbs
  __dshChromeMarkContextRef: undefined | DshChromeMarkContextRef
  __dshChromeRegisterFrontier: undefined | DshChromeRegisterFrontier
}

declare const __DSH_CHROME_BRIDGE_URL__: string
declare const __DSH_CHROME_PROTOCOL_FINGERPRINT__: string
