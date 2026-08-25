/** Provider-neutral Chrome protocol types shared by the host and connector. */
import type { Branded } from '@deepseek-ai/dsh-brand'

export type ChromeCommandId = Branded<'ChromeCommandId'>
export type ChromeConnectorId = Branded<'ChromeConnectorId'>
export type ChromeProviderId = Branded<'ChromeProviderId'>
export type ChromeBuildId = Branded<'ChromeBuildId'>
export type ChromeOperationRevision = Branded<'ChromeOperationRevision'>

export type ChromeJsonValue =
  | null | boolean | number | string | readonly ChromeJsonValue[]
  | { readonly [key: string]: ChromeJsonValue }

export type ChromeTabTarget =
  | { readonly by: 'id'; readonly value: number }
  | { readonly by: 'url'; readonly value: string }
  | { readonly by: 'title'; readonly value: string }
export type ChromeElementTarget =
  | { readonly by: 'uid'; readonly value: string }
  | { readonly by: 'selector'; readonly value: string }
export type ChromePointerTarget = ChromeElementTarget | { readonly by: 'coordinate'; readonly x: number; readonly y: number }
export type ChromeGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

export type ChromeTabCall =
  | { readonly op: 'list' }
  | { readonly op: 'new'; readonly url?: string; readonly groupColor?: ChromeGroupColor }
  | { readonly op: 'activate'; readonly target?: ChromeTabTarget }
  | { readonly op: 'close'; readonly target?: ChromeTabTarget }
  | { readonly op: 'group'; readonly target?: ChromeTabTarget; readonly groupColor?: ChromeGroupColor }
  | { readonly op: 'ungroup'; readonly target?: ChromeTabTarget }

export type ChromeSnapshotOptions = {
  readonly ref?: string
  readonly mode?: 'auto' | 'interactive' | 'forms' | 'pageMap' | 'text' | 'changes' | 'full'
  readonly query?: string
  readonly maxElements?: number
  readonly maxTextChars?: number
  readonly containingText?: string
  readonly role?: string
  readonly nearUid?: string
}
export type ChromePageCall =
  | ({ readonly op: 'snapshot' } & ChromeSnapshotOptions)
  | { readonly op: 'read'; readonly ref?: string; readonly view?: 'content' | 'outline'; readonly query?: string; readonly maxChars?: number }
  | { readonly op: 'inspect'; readonly element: ChromeElementTarget; readonly scrollIntoView?: boolean }
  | { readonly op: 'navigate'; readonly url: string; readonly waitUntilLoad?: boolean; readonly timeoutMs?: number; readonly initScript?: string; readonly snapshot?: ChromeSnapshotOptions }
  | { readonly op: 'evaluate'; readonly expression: string; readonly awaitPromise?: boolean }
  | { readonly op: 'wait'; readonly condition: { readonly by: 'selector' | 'urlIncludes' | 'textContains' | 'expression'; readonly value: string }; readonly timeoutMs?: number; readonly intervalMs?: number }
  | { readonly op: 'console'; readonly clear?: boolean }
  | { readonly op: 'network-list'; readonly includePreserved?: boolean; readonly clear?: boolean }
  | { readonly op: 'network-get'; readonly requestId: string }
  | { readonly op: 'screenshot'; readonly capture: { readonly kind: 'viewport' | 'full-page-tiles' }; readonly format: 'png' | 'jpeg'; readonly quality?: number }

export type ChromeInputCall =
  | { readonly op: 'click'; readonly at: ChromePointerTarget; readonly modifiers?: ChromeModifiers }
  | { readonly op: 'type'; readonly text: string; readonly into?: ChromeElementTarget; readonly pressEnter?: boolean }
  | { readonly op: 'fill'; readonly text: string; readonly into?: ChromeElementTarget; readonly submit?: boolean }
  | { readonly op: 'key'; readonly key: string; readonly at?: ChromeElementTarget; readonly modifiers?: ChromeModifiers }
  | { readonly op: 'hover'; readonly at: ChromePointerTarget }
  | { readonly op: 'drag'; readonly from: ChromePointerTarget; readonly to: ChromePointerTarget; readonly steps?: number }
  | { readonly op: 'tap'; readonly at: ChromePointerTarget }
  | { readonly op: 'scroll'; readonly deltaY?: number; readonly deltaX?: number; readonly within?: ChromeElementTarget; readonly steps?: number }
  | { readonly op: 'upload'; readonly paths: readonly string[]; readonly into?: ChromeElementTarget }
export type ChromeModifiers = { readonly shift?: boolean; readonly control?: boolean; readonly alt?: boolean; readonly meta?: boolean }

export type ChromeSystemCall =
  | { readonly op: 'version' }
  | { readonly op: 'automation-status' }
  | { readonly op: 'clear-stale' }

export type ChromeCommand =
  | { readonly domain: 'tab'; readonly call: ChromeTabCall }
  | { readonly domain: 'page'; readonly call: ChromePageCall }
  | { readonly domain: 'input'; readonly call: ChromeInputCall }
  | { readonly domain: 'system'; readonly call: ChromeSystemCall }

export type ChromeCommandEffect = 'read-only' | 'may-mutate'
export type ChromeCommandPhase = 'accepted' | 'queued' | 'claimed' | 'executing' | 'result-persisted' | 'acknowledged' | 'cancel-requested' | 'cancelled' | 'outcome-unknown'
export type ChromeKernelHealth = 'starting' | 'listening' | 'failed' | 'stopped'
export type ChromeConnectorHealth = 'absent' | 'handshaking' | 'polling' | 'stale'
export type ChromeRuntimeHealth = 'idle' | 'executing' | 'faulted'

export interface ChromeProtocolRevision {
  readonly kernelProtocolVersion: string
  readonly kernelBuildId: ChromeBuildId
  readonly operationRevision: ChromeOperationRevision
}
export interface ChromeConnectorStatus {
  readonly id: ChromeConnectorId
  readonly label: string
  readonly connected: boolean
  readonly lastSeenAt?: number
  readonly queuedCommands: number
  readonly pendingCommands: number
}
export interface ChromeHealth extends ChromeProtocolRevision {
  readonly kernel: ChromeKernelHealth
  readonly connector: ChromeConnectorHealth
  readonly runtime: ChromeRuntimeHealth
  readonly connectorStatus?: ChromeConnectorStatus
  readonly currentCommand?: { readonly id: ChromeCommandId; readonly phase: ChromeCommandPhase; readonly operation: string }
  readonly lastFailure?: { readonly code: string; readonly message: string }
}
export interface ChromeCommandEnvelope extends ChromeProtocolRevision {
  readonly id: ChromeCommandId
  readonly command: ChromeCommand
  readonly effect: ChromeCommandEffect
}
export type ChromeCommandResult =
  | { readonly id: ChromeCommandId; readonly ok: true; readonly value: ChromeJsonValue }
  | { readonly id: ChromeCommandId; readonly ok: false; readonly error: ChromeCommandError }
export type ChromeCommandErrorCode = 'aborted' | 'timeout' | 'rejected' | 'outcome-unknown' | 'connector-offline' | 'protocol-failure'
export interface ChromeCommandError { readonly code: ChromeCommandErrorCode; readonly message: string; readonly details?: ChromeJsonValue }
