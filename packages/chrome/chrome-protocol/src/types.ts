/** Provider-neutral Chrome protocol types shared by the host and connector. */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Chrome protocol ChromeCommandId value. */
export type ChromeCommandId = Branded<'ChromeCommandId'>
/** Chrome protocol ChromeConnectorId value. */
export type ChromeConnectorId = Branded<'ChromeConnectorId'>
/** Chrome protocol ChromeProviderId value. */
export type ChromeProviderId = Branded<'ChromeProviderId'>
/** Chrome protocol ChromeBuildId value. */
export type ChromeBuildId = Branded<'ChromeBuildId'>
/** Chrome protocol ChromeOperationRevision value. */
export type ChromeOperationRevision = Branded<'ChromeOperationRevision'>

/** Chrome protocol ChromeJsonValue value. */
export type ChromeJsonValue =
  | null | boolean | number | string | readonly ChromeJsonValue[]
  | { readonly [key: string]: ChromeJsonValue }

/** Chrome protocol ChromeTabTarget value. */
export type ChromeTabTarget =
  | { readonly by: 'id'; readonly value: number }
  | { readonly by: 'url'; readonly value: string }
  | { readonly by: 'title'; readonly value: string }
/** Chrome protocol ChromeElementTarget value. */
export type ChromeElementTarget =
  | { readonly by: 'uid'; readonly value: string }
  | { readonly by: 'selector'; readonly value: string }
/** Chrome protocol ChromePointerTarget value. */
export type ChromePointerTarget = ChromeElementTarget | { readonly by: 'coordinate'; readonly x: number; readonly y: number }
/** Chrome protocol ChromeGroupColor value. */
export type ChromeGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'

/** Chrome protocol ChromeTabCall value. */
export type ChromeTabCall =
  | { readonly op: 'list' }
  | { readonly op: 'new'; readonly url?: string; readonly groupColor?: ChromeGroupColor }
  | { readonly op: 'activate'; readonly target?: ChromeTabTarget }
  | { readonly op: 'close'; readonly target?: ChromeTabTarget }
  | { readonly op: 'group'; readonly target?: ChromeTabTarget; readonly groupColor?: ChromeGroupColor }
  | { readonly op: 'ungroup'; readonly target?: ChromeTabTarget }

/** Chrome protocol ChromeSnapshotOptions value. */
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
/** Chrome protocol ChromePageCall value. */
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

/** Chrome protocol ChromeInputCall value. */
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
/** Chrome protocol ChromeModifiers value. */
export type ChromeModifiers = { readonly shift?: boolean; readonly control?: boolean; readonly alt?: boolean; readonly meta?: boolean }

/** Chrome protocol ChromeSystemCall value. */
export type ChromeSystemCall =
  | { readonly op: 'version' }
  | { readonly op: 'automation-status' }
  | { readonly op: 'clear-stale' }

/** Chrome protocol ChromeCommand value. */
export type ChromeCommand =
  | { readonly domain: 'tab'; readonly call: ChromeTabCall }
  | { readonly domain: 'page'; readonly call: ChromePageCall }
  | { readonly domain: 'input'; readonly call: ChromeInputCall }
  | { readonly domain: 'system'; readonly call: ChromeSystemCall }

/** Chrome protocol ChromeCommandEffect value. */
export type ChromeCommandEffect = 'read-only' | 'may-mutate'
/** Chrome protocol ChromeCommandPhase value. */
export type ChromeCommandPhase = 'accepted' | 'queued' | 'claimed' | 'executing' | 'result-persisted' | 'acknowledged' | 'cancel-requested' | 'cancelled' | 'outcome-unknown'
/** Chrome protocol ChromeKernelHealth value. */
export type ChromeKernelHealth = 'starting' | 'listening' | 'failed' | 'stopped'
/** Chrome protocol ChromeConnectorHealth value. */
export type ChromeConnectorHealth = 'absent' | 'handshaking' | 'polling' | 'stale'
/** Chrome protocol ChromeRuntimeHealth value. */
export type ChromeRuntimeHealth = 'idle' | 'executing' | 'faulted'

/** Chrome protocol ChromeProtocolRevision value. */
export interface ChromeProtocolRevision {
  readonly kernelProtocolVersion: string
  readonly kernelBuildId: ChromeBuildId
  readonly operationRevision: ChromeOperationRevision
}
/** Chrome protocol ChromeConnectorStatus value. */
export interface ChromeConnectorStatus {
  readonly id: ChromeConnectorId
  readonly label: string
  readonly connected: boolean
  readonly lastSeenAt?: number
  readonly queuedCommands: number
  readonly pendingCommands: number
}
/** Chrome protocol ChromeHealth value. */
export interface ChromeHealth extends ChromeProtocolRevision {
  readonly kernel: ChromeKernelHealth
  readonly connector: ChromeConnectorHealth
  readonly runtime: ChromeRuntimeHealth
  readonly connectorStatus?: ChromeConnectorStatus
  readonly currentCommand?: { readonly id: ChromeCommandId; readonly phase: ChromeCommandPhase; readonly operation: string }
  readonly lastFailure?: { readonly code: string; readonly message: string }
}
/** Chrome protocol ChromeCommandEnvelope value. */
export interface ChromeCommandEnvelope extends ChromeProtocolRevision {
  readonly id: ChromeCommandId
  readonly command: ChromeCommand
  readonly effect: ChromeCommandEffect
}
/** Chrome protocol ChromeCommandResult value. */
export type ChromeCommandResult =
  | { readonly id: ChromeCommandId; readonly ok: true; readonly value: ChromeJsonValue }
  | { readonly id: ChromeCommandId; readonly ok: false; readonly error: ChromeCommandError }
/** Chrome protocol ChromeCommandErrorCode value. */
export type ChromeCommandErrorCode = 'aborted' | 'timeout' | 'rejected' | 'outcome-unknown' | 'connector-offline' | 'protocol-failure'
/** Chrome protocol ChromeCommandError value. */
export interface ChromeCommandError { readonly code: ChromeCommandErrorCode; readonly message: string; readonly details?: ChromeJsonValue }
