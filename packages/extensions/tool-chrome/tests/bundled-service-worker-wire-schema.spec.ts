import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const serviceWorkerSource = readFileSync(
  join(packageDir, 'assets/browser-extension/service-worker.js'),
  'utf8',
)
const popupSource = readFileSync(
  join(packageDir, 'assets/browser-extension/popup.js'),
  'utf8',
)
const popupHtml = readFileSync(
  join(packageDir, 'assets/browser-extension/popup.html'),
  'utf8',
)

/**
 * Extract one `var Name = ...;` statement. Stops at the first top-level `;`
 * so nested Struct / NestedTool* declarations are not included.
 */
function varDeclaration(source: string, name: string): string {
  const match = source.match(new RegExp(String.raw`\bvar\s+${name}\s*=[\s\S]*?;`))
  if (match === null) {
    throw new Error(`service-worker.js is missing \`var ${name}\``)
  }
  return match[0]
}

describe('bundled service-worker PageCall/InputCall wire schema', () => {
  it('keeps PageCall and InputCall as flat Union(flatToolCallsOf(...)), not nested operation structs', () => {
    const pageCall = varDeclaration(serviceWorkerSource, 'PageCall')
    const inputCall = varDeclaration(serviceWorkerSource, 'InputCall')

    expect(pageCall).toMatch(
      /Union\s*\(\s*flatToolCallsOf\s*\(\s*OPERATION_CONTRACTS\.page\s*\)\s*\)/,
    )
    expect(inputCall).toMatch(
      /Union\s*\(\s*flatToolCallsOf\s*\(\s*OPERATION_CONTRACTS\.input\s*\)\s*\)/,
    )

    expect(pageCall).not.toMatch(/operation\s*:\s*PageOperation/)
    expect(inputCall).not.toMatch(/operation\s*:\s*InputOperation/)
  })

  it('keeps popup PageCall/InputCall flat and registers clear-stale', () => {
    const pageCall = varDeclaration(popupSource, 'PageCall')
    const inputCall = varDeclaration(popupSource, 'InputCall')
    expect(pageCall).toMatch(
      /Union\s*\(\s*flatToolCallsOf\s*\(\s*OPERATION_CONTRACTS\.page\s*\)\s*\)/,
    )
    expect(inputCall).toMatch(
      /Union\s*\(\s*flatToolCallsOf\s*\(\s*OPERATION_CONTRACTS\.input\s*\)\s*\)/,
    )
    expect(popupSource).toMatch(/"clear-stale":\s*Struct\(\s*\{\s*op:\s*Literal\("clear-stale"\)/)
    expect(popupSource).toContain('selectors: ["call.capture.kind", "call.format"]')
    expect(popupSource).not.toContain('call.operation.capture.kind')
  })
})

describe('bundled service-worker result contracts', () => {
  it('keeps dynamic wait observations opaque at the bridge boundary', async () => {
    const { operationResultProtocolContract } = await import('../src/protocol/operations.ts')
    expect(operationResultProtocolContract.page?.wait).toMatchObject({ mode: 'opaque' })
  })
})

describe('bundled service-worker poll-decode diagnostics', () => {
  it('formats secret-free poll diagnostics and posts poll-response-invalid for recoverable ids', () => {
    expect(serviceWorkerSource).toContain('POLL_RESPONSE_INVALID_CODE = "poll-response-invalid"')
    expect(serviceWorkerSource).toContain('recoverPollCommandId')
    expect(serviceWorkerSource).toContain('formatPollDecodeDiagnostic')
    expect(serviceWorkerSource).toContain('collectSecretFreeSchemaIssues')
    expect(serviceWorkerSource).toContain('rejectInvalidPollCommand')
    expect(serviceWorkerSource).toContain('handleInvalidPollBody')
    expect(serviceWorkerSource).toMatch(/code:\s*POLL_RESPONSE_INVALID_CODE/)
    expect(serviceWorkerSource).toMatch(
      /logWarning\(\s*"dsh-chrome poll response is invalid and command id is not recoverable"/,
    )
    expect(serviceWorkerSource).toContain('summarizePollBodyForDiagnostic')
    expect(serviceWorkerSource).toContain('secretFreeSchemaLeafMessage')
  })

  it('injects instrumentation helpers and awaits asynchronous snapshot projection', () => {
    expect(serviceWorkerSource).toContain(
      'var PAGE_HELPERS = [getPiChromeState, installPiChromeInstrumentation]',
    )
    expect(serviceWorkerSource).toContain('value: await snapshotPage(...invocationArgs)')
  })

  it('cancels response.body on readResponseText interrupt without referencing reader', () => {
    const start = serviceWorkerSource.indexOf('var readResponseText = ')
    expect(start).toBeGreaterThan(-1)
    const body = serviceWorkerSource.slice(start, start + 1200)
    expect(body).toContain('cancelResponseBody(body)')
    expect(body).not.toMatch(/reader\.cancel/)
    expect(body).not.toMatch(/\breader\b/)
  })
})

describe('bundled service-worker stale-ownership recovery', () => {
  it('registers clear-stale beside automation-status and keeps cleanup ops separate', () => {
    const systemCalls = varDeclaration(serviceWorkerSource, 'SystemCalls')
    expect(systemCalls).toContain('"clear-stale"')
    expect(systemCalls).toContain('"automation-status"')
    expect(systemCalls).toContain('cleanup')
    expect(systemCalls).toContain('"cleanup-all"')

    expect(serviceWorkerSource).toMatch(
      /"clear-stale":\s*defineOperation\s*\(\s*SystemCalls\["clear-stale"\]/,
    )
    expect(serviceWorkerSource).toMatch(
      /case\s+"clear-stale":\s*return\s+browserProgram\s*\(\s*"may-mutate"/,
    )
    expect(serviceWorkerSource).toContain('chrome_automation_clear_stale')
    expect(serviceWorkerSource).toContain('chrome_automation_status')
  })

  it('auto-reconciles only epoch-changed and tab-missing before get/create paths', () => {
    expect(serviceWorkerSource).toContain('autoReconcileSafeStaleAutomationTargets')
    expect(serviceWorkerSource).toMatch(
      /AUTO_RECONCILE_STALE_REASONS\s*=\s*new\s+Set\(\s*\[\s*"epoch-changed"\s*,\s*"tab-missing"\s*\]/,
    )
    expect(serviceWorkerSource).not.toMatch(
      /AUTO_RECONCILE_STALE_REASONS[\s\S]{0,120}tab-outside-regular-profile/,
    )

    for (const name of [
      'getOwnedAutomationTarget',
      'getOrCreateAutomationTarget',
      'createNewAutomationTarget',
    ]) {
      const start = serviceWorkerSource.indexOf(`async function ${name}`)
      expect(start).toBeGreaterThan(-1)
      const body = serviceWorkerSource.slice(start, start + 900)
      expect(body).toContain('autoReconcileSafeStaleAutomationTargets')
    }
  })

  it('keeps clear-stale record-only and names explicit recovery for tab-outside', () => {
    const clearFn = serviceWorkerSource.indexOf('var clearProvedStaleAutomationTargets')
    expect(clearFn).toBeGreaterThan(-1)
    const clearBody = serviceWorkerSource.slice(clearFn, clearFn + 700)
    expect(clearBody).toContain('removeAutomationTarget')
    expect(clearBody).not.toContain('chrome.tabs.remove')
    expect(clearBody).not.toContain('tabs.create')

    expect(serviceWorkerSource).toContain(
      'Call chrome_automation_clear_stale to remove the stale ownership record',
    )
    expect(serviceWorkerSource).toMatch(
      /tab left the active profile's regular windows\. Call chrome_automation_clear_stale/,
    )
  })

  it('exposes same-extension stale status/clear messages without secrets in popup recovery UI', () => {
    expect(serviceWorkerSource).toContain('dsh-chrome/automation/stale-status')
    expect(serviceWorkerSource).toContain('dsh-chrome/automation/clear-stale')
    expect(serviceWorkerSource).toContain('isAutomationRecoveryRequest')
    expect(serviceWorkerSource).toContain('clearAllStaleAutomationTargets')
    expect(serviceWorkerSource).toContain('profileStaleAutomationStatus')

    expect(popupHtml).toContain('id="clear-stale"')
    expect(popupHtml).toContain('Tabs are never closed or adopted')
    expect(popupHtml).not.toMatch(/secret|credential/i)

    const popupRegionStart = popupSource.indexOf('//#region src/browser/popup.ts')
    expect(popupRegionStart).toBeGreaterThan(-1)
    const popupRegion = popupSource.slice(popupRegionStart)
    expect(popupRegion).toContain('dsh-chrome/automation/stale-status')
    expect(popupRegion).toContain('dsh-chrome/automation/clear-stale')
    expect(popupRegion).toContain('Tabs were not closed or adopted')
    expect(popupRegion).not.toMatch(/secret|credential|ownerCredential/i)
  })
})
