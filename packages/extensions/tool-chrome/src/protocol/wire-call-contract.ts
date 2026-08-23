/**
 * Host-owned WireCommand call contract derived from atomic tool descriptors
 * plus explicit system wire ops. Feeds the protocol fingerprint so nested↔flat
 * or parameter-shape drift changes `protocolFingerprint()`.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/wire-call-contract
 */

import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'
import {
  ATOMIC_TOOL_DESCRIPTORS,
  type JsonSchemaProperty,
} from './operations.ts'
import type { JsonSchemaNode } from './schema.ts'

/** Domains that appear on {@link WireDomainRequest}. */
export type WireCallDomain = 'tab' | 'page' | 'input' | 'system'

/** Session context projected into wireCommand / forwardRequest / PollResponse. */
export const SESSION_CONTEXT_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    key: { type: 'string' },
    groupTitle: { type: 'string' },
    foreground: { type: 'boolean' },
  },
  required: ['key', 'groupTitle', 'foreground'],
  additionalProperties: false,
}

/** Tab / page / input wire `target` selector. */
export const WIRE_TARGET_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    by: { type: 'string', enum: ['id', 'url', 'title'] },
    value: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
  },
  required: ['by', 'value'],
  additionalProperties: false,
}

/**
 * System-domain wire calls that are not atomic tools (version / cleanup /
 * cleanup-all / probe). Atomic system tools remain in {@link ATOMIC_TOOL_DESCRIPTORS}.
 */
export const EXPLICIT_SYSTEM_WIRE_CALLS: ReadonlyArray<{
  readonly operation: string
  readonly parameters: Readonly<Record<string, JsonSchemaProperty>>
}> = [
  { operation: 'version', parameters: {} },
  { operation: 'cleanup', parameters: {} },
  { operation: 'cleanup-all', parameters: {} },
  {
    operation: 'probe',
    parameters: {
      target: {
        type: 'object',
        additionalProperties: true,
        description: 'Optional tab selector for probe.',
        properties: {
          by: { type: 'string', enum: ['id', 'url', 'title'] },
          value: {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
          },
        },
      },
    },
  },
]

/**
 * Project one tool-parameter node into the fingerprint JSON Schema subset.
 * @param property - descriptor parameter node (descriptions are stripped later).
 * @returns structural JSON Schema node used in wire call unions.
 */
export const projectParameterToWireSchema = (
  property: JsonSchemaProperty,
): JsonSchemaNode => {
  const node: JsonSchemaNode = {}
  if (property.type !== undefined) node.type = property.type
  if (property.enum !== undefined) node.enum = property.enum
  if (property.additionalProperties !== undefined) {
    node.additionalProperties = property.additionalProperties
  }
  if (property.items !== undefined) {
    node.items = projectParameterToWireSchema(property.items)
  }
  if (property.properties !== undefined) {
    node.properties = Object.fromEntries(
      Object.entries(property.properties).map(([name, child]) => [
        name,
        projectParameterToWireSchema(child),
      ]),
    )
    const required = Object.entries(property.properties)
      .filter(([, child]) => child.required === true)
      .map(([name]) => name)
    if (required.length > 0) node.required = required
  }
  if (property.oneOf !== undefined) {
    node.oneOf = property.oneOf.map(projectParameterToWireSchema)
  }
  return node
}

/**
 * Build one flat wire call schema: `op` const plus operation fields.
 * @param operation - wire `op` discriminant.
 * @param parameters - tool or explicit system parameters.
 * @param optionalExtras - optional wire-only fields (page/input target/background).
 * @returns object schema with `additionalProperties: false`.
 */
export const wireCallSchemaFor = (
  operation: string,
  parameters: ParameterSchemaSpec | Readonly<Record<string, JsonSchemaProperty>>,
  optionalExtras: Readonly<Record<string, JsonSchemaNode>> = {},
): JsonSchemaNode => {
  const properties: Record<string, JsonSchemaNode> = {
    op: { const: operation },
    ...optionalExtras,
  }
  const required: string[] = ['op']
  for (const [name, property] of Object.entries(parameters)) {
    properties[name] = projectParameterToWireSchema(property as JsonSchemaProperty)
    if ((property as JsonSchemaProperty).required === true) required.push(name)
  }
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }
}

const pageInputExtras: Readonly<Record<string, JsonSchemaNode>> = {
  target: WIRE_TARGET_SCHEMA,
  background: { type: 'boolean' },
}

const unionOrSingle = (members: readonly JsonSchemaNode[]): JsonSchemaNode => {
  const [first, ...rest] = members
  if (first === undefined) {
    throw new Error('wire call domain requires at least one member')
  }
  if (rest.length === 0) return first
  return { oneOf: members }
}

/**
 * Complete flat call unions per domain for WireCommand / ForwardRequest.
 * @returns map of domain → oneOf (or single) call schemas covering every op.
 */
export const wireCallContractByDomain = (): Record<WireCallDomain, JsonSchemaNode> => {
  const buckets: Record<WireCallDomain, JsonSchemaNode[]> = {
    tab: [],
    page: [],
    input: [],
    system: [],
  }
  for (const descriptor of ATOMIC_TOOL_DESCRIPTORS) {
    const extras =
      descriptor.domain === 'page' || descriptor.domain === 'input'
        ? pageInputExtras
        : {}
    buckets[descriptor.domain].push(
      wireCallSchemaFor(descriptor.operation, descriptor.parameters, extras),
    )
  }
  for (const systemCall of EXPLICIT_SYSTEM_WIRE_CALLS) {
    buckets.system.push(
      wireCallSchemaFor(systemCall.operation, systemCall.parameters),
    )
  }
  return {
    tab: unionOrSingle(buckets.tab),
    page: unionOrSingle(buckets.page),
    input: unionOrSingle(buckets.input),
    system: unionOrSingle(buckets.system),
  }
}

const domainCallMembers = (
  envelope: Readonly<Record<string, JsonSchemaNode>>,
  requiredEnvelope: readonly string[],
  calls: Record<WireCallDomain, JsonSchemaNode>,
): JsonSchemaNode[] =>
  (['tab', 'page', 'input', 'system'] as const).map(domain => ({
    type: 'object',
    properties: {
      ...envelope,
      domain: { const: domain },
      call: calls[domain],
    },
    required: [...requiredEnvelope, 'domain', 'call'],
    additionalProperties: false,
  }))

/**
 * WireCommand JSON Schema: id + session + domain-tagged flat call unions.
 * @returns oneOf covering tab/page/input/system commands.
 */
export const wireCommandProtocolSchema = (): JsonSchemaNode => {
  const calls = wireCallContractByDomain()
  return {
    oneOf: domainCallMembers(
      {
        id: { type: 'string' },
        session: SESSION_CONTEXT_SCHEMA,
      },
      ['id', 'session'],
      calls,
    ),
  }
}

/**
 * ForwardRequest JSON Schema: session + timeoutMs + domain-tagged flat calls.
 * @returns oneOf covering owner `/command` bodies.
 */
export const forwardRequestProtocolSchema = (): JsonSchemaNode => {
  const calls = wireCallContractByDomain()
  return {
    oneOf: domainCallMembers(
      {
        session: SESSION_CONTEXT_SCHEMA,
        timeoutMs: { type: 'integer' },
      },
      ['session', 'timeoutMs'],
      calls,
    ),
  }
}

/**
 * PollResponse JSON Schema with WireCommand embedded on `type: 'command'`.
 * @param wireCommand - the {@link wireCommandProtocolSchema} node to embed.
 * @returns oneOf for incompatible / command / none.
 */
export const pollResponseProtocolSchema = (wireCommand: JsonSchemaNode): JsonSchemaNode => ({
  oneOf: [
    {
      type: 'object',
      properties: {
        type: { const: 'incompatible' },
        expectedExtensionId: { type: 'string' },
        expectedExtensionDisplayVersion: { type: 'string' },
        actualExtensionDisplayVersion: { type: 'string' },
        expectedProtocolFingerprint: { type: 'string' },
        actualProtocolFingerprint: { type: 'string' },
      },
      required: [
        'type',
        'expectedExtensionId',
        'expectedExtensionDisplayVersion',
        'actualExtensionDisplayVersion',
        'expectedProtocolFingerprint',
        'actualProtocolFingerprint',
      ],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        type: { const: 'command' },
        command: wireCommand,
        expectedExtensionId: { type: 'string' },
        expectedExtensionDisplayVersion: { type: 'string' },
        expectedProtocolFingerprint: { type: 'string' },
      },
      required: [
        'type',
        'command',
        'expectedExtensionId',
        'expectedExtensionDisplayVersion',
        'expectedProtocolFingerprint',
      ],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        type: { const: 'none' },
        expectedExtensionId: { type: 'string' },
        expectedExtensionDisplayVersion: { type: 'string' },
        expectedProtocolFingerprint: { type: 'string' },
      },
      required: [
        'type',
        'expectedExtensionId',
        'expectedExtensionDisplayVersion',
        'expectedProtocolFingerprint',
      ],
      additionalProperties: false,
    },
  ],
})
