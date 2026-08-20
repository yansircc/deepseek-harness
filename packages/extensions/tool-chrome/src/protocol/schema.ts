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

/** JSON-compatible value the wire protocol may carry in results and error details. */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

/** Chrome tab selector by numeric id, URL, or title. */
export type Target =
  | { by: 'id'; value: number }
  | { by: 'url'; value: string }
  | { by: 'title'; value: string }

/** Page element selector by Action Graph uid or CSS selector. */
export type ElementTarget =
  | { by: 'uid'; value: string }
  | { by: 'selector'; value: string }

/** Pointer target: an element or a viewport coordinate in CSS pixels. */
export type PointerTarget =
  | ElementTarget
  | { by: 'coordinate'; x: number; y: number }

/** Tab-domain wire call: `op` plus operation-specific fields. */
export type TabCall = { op: string; [key: string]: unknown }
/** Page-domain wire call: `op` plus operation-specific fields. */
export type PageCall = { op: string; [key: string]: unknown }
/** Input-domain wire call: `op` plus operation-specific fields. */
export type InputCall = { op: string; [key: string]: unknown }
/** Page-domain call as it appears on the wire (same fields as {@link PageCall}). */
export type WirePageCall = PageCall
/** System-domain wire call: `op` plus operation-specific fields. */
export type SystemCall = { op: string; [key: string]: unknown }
/** Tool-facing input call (same fields as {@link InputCall}). */
export type ToolInputCall = InputCall
/** Tool-facing page call (same fields as {@link PageCall}). */
export type ToolPageCall = PageCall

/** Session grouping the connector uses to own tabs and decide foreground. */
export interface SessionContext {
  key: string
  groupTitle: string
  foreground: boolean
}

/** Stored connector credentials: id, shared secret, and display label. */
export interface ConnectorIdentity {
  connectorId: string
  secret: string
  label: string
}

/** Connector fields the HTTP route and HMAC proofs bind: id, extension, version, fingerprint. */
export interface ConnectorRouteIdentity {
  connectorId: string
  extensionId: string
  extensionDisplayVersion: string
  protocolFingerprint: string
}

/** Full connector record: stored credentials plus route/HMAC identity. */
export interface ProfileConnector extends ConnectorIdentity, ConnectorRouteIdentity {}

/** Connector identity safe to expose without the shared secret. */
export interface PublicConnector extends ConnectorRouteIdentity {
  label: string
}

/** Live connector view: public identity plus connection and mailbox counts. */
export interface ConnectorStatus extends PublicConnector {
  connected: boolean
  lastSeenAt?: number
  queuedCommands: number
  pendingCommands: number
}

/** `/status` payload: bind URL, server mode, expected extension, and optional connector. */
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

/** Domain-tagged automation call without the command envelope. */
export type WireDomainRequest =
  | { domain: 'tab'; call: TabCall }
  | { domain: 'page'; call: WirePageCall }
  | { domain: 'input'; call: InputCall }
  | { domain: 'system'; call: SystemCall }

/** Command id and session context wrapped around a domain call. */
export interface WireCommandEnvelope {
  id: string
  session: SessionContext
}

/** Enqueued command: domain call plus id and session. */
export type WireCommand = WireDomainRequest & WireCommandEnvelope

/** Connector refused the command; `code` is the stable rejection reason. */
export interface WireCommandRejected {
  _tag: 'CommandRejected'
  code: string
  message: string
  details?: JsonValue
}

/** Command finished without a known success or rejection. */
export interface WireCommandOutcomeUnknown {
  _tag: 'CommandOutcomeUnknown'
  message: string
  cause: string
}

/** Terminal connector failure: explicit rejection or unknown outcome. */
export type WireCommandTerminalFailure = WireCommandRejected | WireCommandOutcomeUnknown

/** Per-command result: `ok` plus `value`, or `ok: false` plus a terminal failure. */
export type WireResult =
  | { id: string; ok: true; value: JsonValue }
  | { id: string; ok: false; error: WireCommandTerminalFailure }

/** Owner `/command` body: domain call, session, and timeout in milliseconds. */
export type ForwardRequest = WireDomainRequest & {
  session: SessionContext
  timeoutMs: number
}

/** Owner-visible failure when the bridge cannot complete a forwarded command. */
export type WireBridgeFailure =
  | { _tag: 'BridgeStopped'; message: string }
  | { _tag: 'BridgeUnavailable'; message: string; cause?: string }
  | { _tag: 'ConnectorNotBound'; message: string }
  | { _tag: 'ConnectorOffline'; connectorId: string; message: string }
  | { _tag: 'CommandTimeout'; message: string; timeoutMs: number }
  | WireCommandOutcomeUnknown
  | WireCommandRejected
  | { _tag: 'ProtocolFailure'; message: string; cause: string }

/** Owner `/command` response: success value or a {@link WireBridgeFailure}. */
export type ForwardResponse =
  | { ok: true; value: JsonValue }
  | { ok: false; error: WireBridgeFailure }

/** Handshake body the bridge returns so the client can verify the server proof. */
export interface BridgeAuthenticationHandshake {
  bridgeDisplayVersion: string
  protocolFingerprint: string
  bridgeEpoch: string
  requestNonce: string
  proof: string
}

/** Connector `/next` payload: incompatible versions, a command, or an idle poll. */
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

/** JSON Schema projections mixed into the protocol fingerprint for each wire payload. */
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

/**
 * Project a wire schema node to plain JSON (for canonical serialization).
 * @param node - a {@link JsonSchemaNode} or the named schema map.
 * @returns the same value; identity projection so callers can serialize without a Schema runtime.
 */
export const toJsonSchema = (node: JsonSchemaNode | Record<string, JsonSchemaNode>): unknown =>
  node

/** Alias of {@link WireProtocolContractSchema} used as the fingerprint `wire` input. */
export const WireProtocolContract = WireProtocolContractSchema

/** Named JSON Schema map bound into the protocol fingerprint as `wire`. */
export type WireProtocolContract = typeof WireProtocolContractSchema

// Re-export for convenience
export { MAX_ADMITTED_COMMANDS_PER_CONNECTOR }
