import { type Static, type TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

// ---------------------------------------------------------------------------
// Minimal inline types (avoid cross-module imports at this layer)
// ---------------------------------------------------------------------------

/** A JSON object record – mirrors the original protocol.ts definition. */
export type JsonRecord = Record<string, unknown>

/**
 * Read-only projection of one zeroY site connection.
 * Mirrors the shape from the source `connection.ts` without pulling in Effect.
 */
export type SiteConnection = {
  readonly siteId: string
  readonly label: string
  readonly endpoint: string
  /** Read-only projection of the grant for Connector requests (production). */
  readonly grant: {
    readonly id: string
    readonly credentialRef: string
  } | null
  /** Legacy headless/CI injected global key. Never used in production. */
  readonly connectionKey: string | null
  /** Revocation state owned by the Pipee connection registry. */
  readonly revoked: boolean
  /** Injected by the session; resolves the grant secret from protected storage. */
  readonly readGrantSecret?: () => string
}

// ---------------------------------------------------------------------------
// Error class (replaces Data.TaggedError)
// ---------------------------------------------------------------------------

export class ZeroYConnectorError extends Error {
  readonly code: string | undefined
  readonly status: number | undefined
  readonly data: JsonRecord | undefined

  constructor(fields: {
    message: string
    status?: number
    code?: string
    data?: JsonRecord
  }) {
    super(fields.message)
    this.name = 'ZeroYConnectorError'
    this.code = fields.code
    this.status = fields.status
    this.data = fields.data
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const asRecord = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const connectorError = (
  payload: JsonRecord,
): { readonly message: string; readonly code?: string; readonly data?: JsonRecord } | undefined => {
  const error = asRecord(payload.error)
  if (!error || typeof error.message !== 'string') return undefined
  const data = asRecord(error.data)
  return {
    message: error.message,
    ...(typeof error.code === 'string' ? { code: error.code } : {}),
    ...(data === null ? {} : { data }),
  }
}

// ---------------------------------------------------------------------------
// Core HTTP call
// ---------------------------------------------------------------------------

export async function connectorCall(
  connection: SiteConnection,
  path: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
  draftActorId?: string,
): Promise<JsonRecord> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')

  // Production connections authenticate with the Pipee client grant. The
  // legacy x-zeroy-key header is reserved for headless/CI injected sites.
  if (connection.grant !== null && connection.readGrantSecret !== undefined) {
    let secret: string
    try {
      secret = connection.readGrantSecret()
    } catch (cause) {
      throw new ZeroYConnectorError({
        message: `Could not read grant secret for ${connection.label}: ${String(cause)}`,
      })
    }
    headers.set('authorization', `Bearer ${secret}`)
  } else if (connection.connectionKey !== null) {
    headers.set('x-zeroy-key', connection.connectionKey)
  } else {
    throw new ZeroYConnectorError({
      message: `Connection ${connection.label} has no grant secret. Re-authorize the site.`,
    })
  }

  if (draftActorId !== undefined) headers.set('x-zeroy-draft-actor', draftActorId)
  if (init.body !== undefined) headers.set('content-type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${connection.endpoint}/wp-json/zeroy/v1/${path}`, {
      ...init,
      headers,
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (cause) {
    throw new ZeroYConnectorError({
      message: `Could not reach ${connection.label}: ${String(cause)}`,
    })
  }

  let text: string
  try {
    text = await response.text()
  } catch (cause) {
    throw new ZeroYConnectorError({
      message: `Could not read Connector response: ${String(cause)}`,
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ZeroYConnectorError({
      message: `Connector returned invalid JSON: ${text.slice(0, 300)}`,
    })
  }

  const payload = asRecord(parsed)
  if (payload === null) {
    throw new ZeroYConnectorError({
      message: 'Connector returned a non-object JSON payload.',
    })
  }

  if (!response.ok) {
    const connector = connectorError(payload)
    throw new ZeroYConnectorError({
      message:
        connector?.message ?? `${connection.label} rejected the request (${response.status}).`,
      status: response.status,
      ...(connector?.code === undefined ? {} : { code: connector.code }),
      ...(connector?.data === undefined ? {} : { data: connector.data }),
    })
  }

  return payload
}

// ---------------------------------------------------------------------------
// Public convenience wrappers
// ---------------------------------------------------------------------------

export function connectorGet(
  connection: SiteConnection,
  path: string,
  signal?: AbortSignal,
  draftActorId?: string,
): Promise<JsonRecord> {
  return connectorCall(connection, path, { method: 'GET' }, signal, draftActorId)
}

export function connectorPost(
  connection: SiteConnection,
  path: string,
  payload: Readonly<Record<string, unknown>>,
  signal?: AbortSignal,
  draftActorId?: string,
): Promise<JsonRecord> {
  return connectorCall(
    connection,
    path,
    { method: 'POST', body: JSON.stringify(payload) },
    signal,
    draftActorId,
  )
}

// ---------------------------------------------------------------------------
// Payload validation (keeps TypeBox since it's a declared dependency)
// ---------------------------------------------------------------------------

/**
 * The Connector is remote. Successful HTTP is therefore insufficient: every
 * stable response boundary must prove its wire contract before it reaches a
 * tool result. Dynamic site facts remain inside their declared JsonValue
 * slots; this checks the stable envelope without creating a local shadow
 * model of a site's ThemeSchema or content.
 */
export function decodeConnectorPayload<Schema extends TSchema>(
  contract: Schema,
  label: string,
  payload: JsonRecord,
): Static<Schema> {
  if (Value.Check(contract, payload)) {
    return payload as Static<Schema>
  }

  throw new ZeroYConnectorError({
    code: 'zeroy_connector_response_invalid',
    message: `Connector returned an invalid ${label} response.`,
    data: {
      label,
      issues: [...Value.Errors(contract, payload)]
        .slice(0, 8)
        .map(issue => ({ path: issue.path || 'response', message: issue.message })),
    },
  })
}
