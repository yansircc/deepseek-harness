import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { messageOf } from '../core/errors.js'
import { requestConnectorIdentity } from './connector-identity-message.js'

const identity = document.querySelector<HTMLParagraphElement>('#identity')!
const state = document.querySelector<HTMLParagraphElement>('#state')!
const staleRecovery = document.querySelector<HTMLElement>('#stale-recovery')!
const staleStatus = document.querySelector<HTMLParagraphElement>('#stale-status')!
const clearStaleButton = document.querySelector<HTMLButtonElement>('#clear-stale')!
const effectRuntime = ManagedRuntime.make(Layer.empty)

class PopupRecoveryFailure extends Data.TaggedError('PopupRecoveryFailure')<{
  readonly message: string
}> {}

const requestAutomationRecovery = (
  request: { readonly type: 'dsh-chrome/automation/stale-status' | 'dsh-chrome/automation/clear-stale' },
) => Effect.tryPromise({
  try: () => chrome.runtime.sendMessage(request),
  catch: cause => new PopupRecoveryFailure({ message: messageOf(cause) }),
}).pipe(
  Effect.flatMap(response => response.ok
    ? Effect.succeed(response.result)
    : Effect.fail(new PopupRecoveryFailure({ message: response.error }))),
)

const refreshStaleStatus = requestAutomationRecovery({
  type: 'dsh-chrome/automation/stale-status',
}).pipe(
  Effect.tap(result => Effect.sync(() => {
    const staleCount = result.staleCount ?? 0
    staleRecovery.hidden = staleCount === 0
    staleStatus.textContent = `${staleCount} stale ownership record${staleCount === 1 ? '' : 's'} can be cleared safely.`
  })),
  Effect.catch(() => Effect.void),
)

const render = Effect.gen(function* () {
  const connector = yield* requestConnectorIdentity({ type: 'dsh-chrome/connector/load' })
  yield* Effect.sync(() => {
    identity.textContent = `${connector.label} · ${connector.connectorId.slice(0, 8)} · v${connector.extensionDisplayVersion}`
    state.textContent = 'Connects to the local DSH bridge automatically while this Chrome profile is open.'
    state.dataset.level = 'success'
  })
  yield* refreshStaleStatus
}).pipe(
  Effect.catch(error => Effect.sync(() => {
    state.textContent = messageOf(error)
    state.dataset.level = 'error'
  })),
)

clearStaleButton.addEventListener('click', () => {
  clearStaleButton.disabled = true
  effectRuntime.runCallback(
    requestAutomationRecovery({ type: 'dsh-chrome/automation/clear-stale' }).pipe(
      Effect.tap(result => Effect.sync(() => {
        const cleared = result.staleOwnershipsCleared ?? 0
        staleStatus.textContent = `${cleared} stale ownership record${cleared === 1 ? '' : 's'} cleared. Tabs were not closed or adopted.`
        staleRecovery.hidden = cleared > 0
      })),
      Effect.catch(error => Effect.sync(() => {
        staleStatus.textContent = messageOf(error)
      })),
      Effect.ensuring(Effect.sync(() => {
        clearStaleButton.disabled = false
      })),
    ),
    { onExit: () => undefined },
  )
})

effectRuntime.runCallback(render, { onExit: () => undefined })
