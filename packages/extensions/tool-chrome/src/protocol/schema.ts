/**
 * Wire protocol types for the pi-chrome bridge. Ported from the pi-chrome
 * extension (`src/protocol/schema.ts`) with Effect Schema replaced by plain
 * TypeScript types and hand-written JSON Schema projections.
 *
 * The JSON Schema projections (`toJsonSchema`) feed the protocol fingerprint;
 * they are deliberately simple and deterministic. Because the Chrome
 * extension is rebuilt from this same codebase, fingerprint consistency is
 * internal to the DSH tool-chrome package.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/schema
 */

import { MAX_ADMITTED_COMMANDS_PER_CONNECTOR } from './bridge-contract.ts'

// ---------------------------------------------------------------------------
// Primitive constraints
// ---------------------------------------------------------------------------

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type Target =
  | { by: 'id'; value: number }
  | { by: 'url'; value: string }
  | { by: 'title'; value: string }

export type ElementTarget =
  | { by: 'uid'; value: string }
  | { by: 'selector'; value: string }

export type PointerTarget =
  | ElementTarget
  | { by: 'coordinate'; x: number; y: number }

export type TabCall = { op: string; [key: string]: unknown }
export type PageCall = { op: string; [key: string]: unknown }
export type InputCall = { op: string; [key: string]: unknown }
export type WirePageCall = PageCall
export type SystemCall = { op: string; [key: string]: unknown }
export type ToolInputCall = InputCall
export type ToolPageCall = PageCall

export interface SessionContext {
  key: string
  groupTitle: string
  foreground: boolean
}

export interface ConnectorIdentity {
  connectorId: string
  secret: string
  label: string
}

export interface ConnectorRouteIdentity {
  connectorId: string
  extensionId: string
  extensionDisplayVersion: string
  protocolFingerprint: string
}

export interface ProfileConnector extends ConnectorIdentity, ConnectorRouteIdentity {}

export interface PublicConnector extends ConnectorRouteIdentity {
  label: string
}

export interface ConnectorStatus extends PublicConnector {
  connected: boolean
  lastSeenAt?: number
  queuedCommands: number
  pendingCommands: number
}

export interface BridgeStatusResponse {
  url: string
  mode: 'server' | 'client' | 'stopped' | 'closed'
  extensionExpectation: {
    extensionId: string
    displayVersion: string
    protocolFingerprint: string
  }
  connector?: ConnectorStatus
}

export type WireDomainRequest =
  | { domain: 'tab'; call: TabCall }
  | { domain: 'page'; call: WirePageCall }
  | { domain: 'input'; call: InputCall }
  | { domain: 'system'; call: SystemCall }

export interface WireCommandEnvelope {
  id: string
  session: SessionContext
}

export type WireCommand = WireDomainRequest & WireCommandEnvelope

export interface WireCommandRejected {
  _tag: 'CommandRejected'
  code: string
  message: string
  details?: JsonValue
}

export interface WireCommandOutcomeUnknown {
  _tag: 'CommandOutcomeUnknown'
  message: string
  cause: string
}

export type WireCommandTerminalFailure = WireCommandRejected | WireCommandOutcomeUnknown

export type WireResult =
  | { id: string; ok: true; value: JsonValue }
  | { id: string; ok: false; error: WireCommandTerminalFailure }

export type ForwardRequest = WireDomainRequest & {
  session: SessionContext
  timeoutMs: number
}

export type WireBridgeFailure =
  | { _tag: 'BridgeStopped'; message: string }
  | { _tag: 'BridgeUnavailable'; message: string; cause?: string }
  | { _tag: 'ConnectorNotBound'; message: string }
  | { _tag: 'ConnectorOffline'; connectorId: string; message: string }
  | { _tag: 'CommandTimeout'; message: string; timeoutMs: number }
  | WireCommandOutcomeUnknown
  | WireCommandRejected
  | { _tag: 'ProtocolFailure'; message: string; cause: string }

export type ForwardResponse =
  | { ok: true; value: JsonValue }
  | { ok: false; error: WireBridgeFailure }

export interface BridgeAuthenticationHandshake {
  bridgeDisplayVersion: string
  protocolFingerprint: string
  bridgeEpoch: string
  requestNonce: string
  proof: string
}

export type PollResponse =
  | {
    type: 'incompatible'
    expectedExtensionId: string
    expectedExtensionDisplayVersion: string
    actualExtensionDisplayVersion: string
    expectedProtocolFingerprint: string
    actualProtocolFingerprint: string
  }
  | {
    type: 'command'
    command: WireCommand
    expectedExtensionId: string
    expectedExtensionDisplayVersion: string
    expectedProtocolFingerprint: string
  }
  | {
    type: 'none'
    expectedExtensionId: string
    expectedExtensionDisplayVersion: string
    expectedProtocolFingerprint: string
  }

// ---------------------------------------------------------------------------
// JSON Schema projections (for the protocol fingerprint)
// ---------------------------------------------------------------------------

/** A minimal JSON Schema node (subset used by the fingerprint contract). */
export type JsonSchemaNode = {
  type?: string | readonly string[]
  required?: readonly string[]
  properties?: Record<string, JsonSchemaNode>
  items?: JsonSchemaNode
  const?: unknown
  enum?: readonly unknown[]
  anyOf?: readonly JsonSchemaNode[]
  oneOf?: readonly JsonSchemaNode[]
  additionalProperties?: boolean
}

export const WireProtocolContractSchema: Record<string, JsonSchemaNode> = {
  bridgeStatus: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      mode: { type: 'string' },
      extensionExpectation: {
        type: 'object',
        properties: {
          extensionId: { type: 'string' },
          displayVersion: { type: 'string' },
          protocolFingerprint: { type: 'string' },
        },
        required: ['extensionId', 'displayVersion', 'protocolFingerprint'],
      },
    },
    required: ['url', 'mode', 'extensionExpectation'],
  },
  wireCommand: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      session: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          groupTitle: { type: 'string' },
          foreground: { type: 'boolean' },
        },
        required: ['key', 'groupTitle', 'foreground'],
      },
      domain: { type: 'string' },
      call: { type: 'object' },
    },
    required: ['id', 'session', 'domain', 'call'],
  },
  wireResult: {
    oneOf: [
      {
        type: 'object',
        properties: { id: { type: 'string' }, ok: { const: true } },
        required: ['id', 'ok'],
      },
      {
        type: 'object',
        properties: { id: { type: 'string' }, ok: { const: false } },
        required: ['id', 'ok'],
      },
    ],
  },
  forwardRequest: {
    type: 'object',
    properties: {
      session: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          groupTitle: { type: 'string' },
          foreground: { type: 'boolean' },
        },
        required: ['key', 'groupTitle', 'foreground'],
      },
      timeoutMs: { type: 'integer' },
      domain: { type: 'string' },
      call: { type: 'object' },
    },
    required: ['session', 'timeoutMs', 'domain', 'call'],
  },
  forwardResponse: {
    oneOf: [
      { type: 'object', properties: { ok: { const: true } }, required: ['ok'] },
      { type: 'object', properties: { ok: { const: false } }, required: ['ok'] },
    ],
  },
  bridgeAuthenticationHandshake: {
    type: 'object',
    properties: {
      bridgeDisplayVersion: { type: 'string' },
      protocolFingerprint: { type: 'string' },
      bridgeEpoch: { type: 'string' },
      requestNonce: { type: 'string' },
      proof: { type: 'string' },
    },
    required: [
      'bridgeDisplayVersion',
      'protocolFingerprint',
      'bridgeEpoch',
      'requestNonce',
      'proof',
    ],
  },
  pollResponse: {
    oneOf: [
      {
        type: 'object',
        properties: { type: { const: 'incompatible' } },
        required: ['type'],
      },
      {
        type: 'object',
        properties: { type: { const: 'command' } },
        required: ['type'],
      },
      {
        type: 'object',
        properties: { type: { const: 'none' } },
        required: ['type'],
      },
    ],
  },
}

/** Project a wire schema node to plain JSON (for canonical serialization). */
export const toJsonSchema = (node: JsonSchemaNode | Record<string, JsonSchemaNode>): unknown =>
  node

export const WireProtocolContract = WireProtocolContractSchema

export type WireProtocolContract = typeof WireProtocolContractSchema

// Re-export for convenience
export { MAX_ADMITTED_COMMANDS_PER_CONNECTOR }
