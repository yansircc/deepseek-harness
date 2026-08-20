/**
 * Protocol fingerprint: a SHA-256 over the canonical JSON of every protocol
 * contract the bridge and its extension must agree on. A fingerprint mismatch
 * means the two sides speak different protocol versions and refuse to
 * connect.
 *
 * Ported from the pi-chrome extension (`src/protocol/protocol-fingerprint.ts`)
 * with Effect replaced by plain functions.
 *
 * NOTE: The Chrome extension is rebuilt from this same codebase, so the
 * fingerprint here and the one the extension computes are consistent by
 * construction. The canonicalization rules (semantic JSON Schema stripping,
 * sorting) are preserved from the original so the value is deterministic.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/fingerprint
 */

import { createHash } from 'node:crypto'
import bridge from './bridge.json' with { type: 'json' }
import connectorAuthentication from './connector-auth.json' with { type: 'json' }
import { authenticationMessageProtocolContract } from './auth.ts'
import { EVALUATION_VALUE_CONTRACT } from './evaluation-value-contract.ts'
import { WireProtocolContract } from './schema.ts'
import { operationResultProtocolContract } from './operations.ts'

const JSON_SCHEMA_ANNOTATIONS = new Set([
  '$comment',
  'default',
  'deprecated',
  'description',
  'examples',
  'readOnly',
  'title',
  'writeOnly',
])
const JSON_SCHEMA_MAPS = new Set([
  '$defs',
  'definitions',
  'dependentSchemas',
  'patternProperties',
  'properties',
])
const JSON_SCHEMA_MEMBERS = new Set([
  'additionalProperties',
  'contains',
  'contentSchema',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
])
const JSON_SCHEMA_SET_ARRAYS = new Set(['allOf', 'anyOf', 'enum', 'oneOf', 'required', 'type'])

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, canonicalize((value as Record<string, unknown>)[key])]),
  )
}

const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value))

const semanticJsonSchema = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  const schema = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(schema).flatMap(([key, member]) => {
      if (JSON_SCHEMA_ANNOTATIONS.has(key)) return []
      if (JSON_SCHEMA_MAPS.has(key) && typeof member === 'object' && member !== null) {
        return [
          [
            key,
            Object.fromEntries(
              Object.entries(member as Record<string, unknown>).map(([name, child]) => [
                name,
                semanticJsonSchema(child),
              ]),
            ),
          ],
        ]
      }
      if (JSON_SCHEMA_MEMBERS.has(key)) return [[key, semanticJsonSchema(member)]]
      if (key === 'prefixItems' && Array.isArray(member)) {
        return [[key, member.map(semanticJsonSchema)]]
      }
      if ((key === 'allOf' || key === 'anyOf' || key === 'oneOf') && Array.isArray(member)) {
        const normalized = member.map(semanticJsonSchema)
        return [
          [
            key,
            normalized.sort((left, right) =>
              canonicalJson(left).localeCompare(canonicalJson(right)),
            ),
          ],
        ]
      }
      if (JSON_SCHEMA_SET_ARRAYS.has(key) && Array.isArray(member)) {
        const normalized = member.map(canonicalize)
        return [
          [
            key,
            normalized.sort((left, right) =>
              canonicalJson(left).localeCompare(canonicalJson(right)),
            ),
          ],
        ]
      }
      return [[key, canonicalize(member)]]
    }),
  )
}

const operationResultSemantics = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([domain, operations]) => [
      domain,
      typeof operations !== 'object' || operations === null || Array.isArray(operations)
        ? operations
        : Object.fromEntries(
          Object.entries(operations).map(([operation, contract]) => {
            if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) {
              return [operation, contract]
            }
            const projected = contract as Record<string, unknown>
            if (projected.mode === 'schema') {
              return [operation, { ...projected, schema: semanticJsonSchema(projected.schema) }]
            }
            if (projected.mode === 'by-call-fields') {
              const variants = projected.variants as Record<string, Record<string, unknown>>
              return [
                operation,
                {
                  ...projected,
                  variants: Object.fromEntries(
                    Object.entries(variants).map(([capture, formats]) => [
                      capture,
                      Object.fromEntries(
                        Object.entries(formats).map(([format, schema]) => [
                          format,
                          semanticJsonSchema(schema),
                        ]),
                      ),
                    ]),
                  ),
                },
              ]
            }
            return [operation, projected]
          }),
        ),
    ]),
  )
}

const semanticProtocolProjection = (contract: unknown): unknown => {
  if (typeof contract !== 'object' || contract === null || Array.isArray(contract)) return contract
  const value = contract as Record<string, unknown>
  return {
    ...value,
    ...(Object.hasOwn(value, 'wire') ? { wire: semanticJsonSchema(value.wire) } : {}),
    ...(Object.hasOwn(value, 'operationResults')
      ? { operationResults: operationResultSemantics(value.operationResults) }
      : {}),
  }
}

/**
 * Canonical JSON of a protocol-contract object after semantic JSON Schema stripping and key sort.
 * @param contract - raw contract tree (wire, operation results, auth messages, and fixtures).
 * @returns deterministic JSON string; equal contracts produce equal strings.
 */
export const canonicalProtocolContractFor = (contract: unknown): string =>
  JSON.stringify(canonicalize(semanticProtocolProjection(contract)))

/** The browser-companion contract placeholder. Kept minimal and stable. */
export const BROWSER_COMPANION_CONTRACT = 'pipee/browser-companion@2'

/**
 * Canonical JSON of the live bridge/extension protocol contract.
 * @returns deterministic JSON of wire, operations, evaluation, auth, companion, and JSON fixtures.
 */
export const canonicalProtocolContract: () => string = () =>
  canonicalProtocolContractFor({
    wire: WireProtocolContract,
    operationResults: operationResultProtocolContract,
    evaluationValues: EVALUATION_VALUE_CONTRACT,
    authenticationMessages: authenticationMessageProtocolContract,
    browserCompanion: BROWSER_COMPANION_CONTRACT,
    bridge,
    connectorAuthentication,
  })

/**
 * Compute the protocol fingerprint: SHA-256 hex of the canonical contract.
 * @returns 64-character lowercase hex; mismatch means the peers refuse to connect.
 */
export const protocolFingerprint: () => string = () =>
  createHash('sha256').update(canonicalProtocolContract(), 'utf8').digest('hex')
