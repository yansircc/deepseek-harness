import { getDshChromeState } from './action-core.js'
import { installDshChromeInstrumentation } from './action-instrumentation.js'

export function listConsoleMessages(clear: boolean) {
  installDshChromeInstrumentation()
  const state = getDshChromeState()
  const messages = state.console.slice()
  if (clear) state.console = []
  return { messages, count: messages.length }
}

export function listNetworkRequests(includePreservedRequests: boolean, clear: boolean) {
  installDshChromeInstrumentation()
  const state = getDshChromeState()
  const currentUrl = location.href
  const requests = state.network
    .filter(request => includePreservedRequests || request.pageUrl === currentUrl)
    .map(({ responseBody, ...summary }) => ({
      ...summary,
      hasResponseBody: responseBody !== undefined,
    }))
  if (clear) state.network = []
  return {
    requests,
    count: requests.length,
    note: 'Captures fetch/XHR after instrumentation is installed. Browser-initiated document/static asset requests are not captured.',
  }
}

export function getNetworkRequest(requestId: string): DshChromeNetworkEntry {
  installDshChromeInstrumentation()
  const request = getDshChromeState().network.find(entry => entry.id === requestId)
  if (!request) throw new Error(`No network request with id ${requestId}`)
  return request
}
