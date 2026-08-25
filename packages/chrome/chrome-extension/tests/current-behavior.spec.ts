import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const artifactRoot = join(import.meta.dirname, '..', 'dist/browser-extension')
const serviceWorker = await readFile(join(artifactRoot, 'service-worker.js'), 'utf8')
const popup = await readFile(join(artifactRoot, 'popup.js'), 'utf8')
const popupHtml = await readFile(join(artifactRoot, 'popup.html'), 'utf8')

describe('current DSH Chrome connector behavior', () => {
  it('keeps asynchronous snapshot and instrumentation dependencies in the authored bundle', () => {
    expect(serviceWorker).toContain(
      'var PAGE_HELPERS = [getDshChromeState, installDshChromeInstrumentation]',
    )
    expect(serviceWorker).toContain('value: await snapshotPage(...invocationArgs)')
    expect(serviceWorker).toContain('wait: defineOperation(PageCalls.wait, opaque(')
  })

  it('keeps bounded malformed-poll rejection and stale ownership recovery', () => {
    expect(serviceWorker).toContain('POLL_RESPONSE_INVALID_CODE = "poll-response-invalid"')
    expect(serviceWorker).toContain('recoverPollCommandId')
    expect(serviceWorker).toContain('collectSecretFreeSchemaIssues')
    expect(serviceWorker).toContain('"clear-stale"')
    expect(serviceWorker).toContain('dsh-chrome/automation/clear-stale')
  })

  it('keeps the popup recovery control and flat screenshot selectors', () => {
    expect(popupHtml).toContain('id="clear-stale"')
    expect(popup).toContain('dsh-chrome/automation/clear-stale')
    expect(serviceWorker).toContain('selectors: ["call.capture.kind", "call.format"]')
    expect(serviceWorker).not.toContain('call.operation.capture.kind')
  })
})
