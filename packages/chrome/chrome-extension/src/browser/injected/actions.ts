import { getDshChromeState } from './action-core.js'
import { installDshChromeInstrumentation } from './action-instrumentation.js'

export {
  getNetworkRequest,
  listConsoleMessages,
  listNetworkRequests,
} from './action-diagnostics.js'
export { projectEvaluationValue } from './evaluation-value.js'
export { probePage } from './action-instrumentation.js'

export const PAGE_HELPERS = [getDshChromeState, installDshChromeInstrumentation] as const
