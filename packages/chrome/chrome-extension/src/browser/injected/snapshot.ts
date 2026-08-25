// Static MAIN-world entry bundled by the MV3 extension build graph.
// It stays free of eval/new Function so strict CSP cannot block observation.
import { inspectTarget, readPage, snapshotPage } from './snapshot-runtime.js'
import {
  grantActionVerbs,
  markContextRef,
  registerFrontier,
  rememberElement,
} from './action-core.js'

const injectedGlobals = globalThis as typeof globalThis & DshChromeInjectedGlobals

injectedGlobals.__dshChromeSnapshotPage = snapshotPage
injectedGlobals.__dshChromeReadPage = readPage
injectedGlobals.__dshChromeInspectTarget = inspectTarget
injectedGlobals.__dshChromeRememberElement = rememberElement
injectedGlobals.__dshChromeGrantActionVerbs = grantActionVerbs
injectedGlobals.__dshChromeMarkContextRef = markContextRef
injectedGlobals.__dshChromeRegisterFrontier = registerFrontier
