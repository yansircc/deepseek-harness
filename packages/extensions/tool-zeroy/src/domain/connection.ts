/**
 * SiteConnection is the zeroY extension's read-only projection of one
 * connection. Facts live in the environment; this type never carries grant
 * plaintext. Credentials are resolved via the DSH credentials seam at the
 * session layer.
 *
 * The sole source for headless/CI connections is ZEROY_SITES (env var).
 */
export type SiteConnection = {
  readonly siteId: string
  readonly label: string
  readonly endpoint: string
  /** Read-only projection of the grant for Connector requests. */
  readonly grant: {
    readonly id: string
    readonly credentialRef: string
  } | null
  /** Legacy headless/CI injected global key. Never used in production. */
  readonly connectionKey: string | null
  /** Revocation state owned by the connection registry. */
  readonly revoked: boolean
}

/** Thrown when `ZEROY_SITES` JSON is missing required fields, has a bad endpoint, or duplicates `siteId`. */
export class ZeroYConnectionConfigError extends Error {
  /** Closed-union discriminant for this configuration failure. */
  readonly code = 'ZeroYConnectionConfigError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ZeroYConnectionConfigError'
  }
}

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== ''

const decodeConnection = (value: unknown): SiteConnection | ZeroYConnectionConfigError => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return new ZeroYConnectionConfigError('Each ZEROY_SITES item must be an object.')
  }
  const candidate = value as Record<string, unknown>
  if (
    !nonEmptyString(candidate.siteId) ||
    !nonEmptyString(candidate.label) ||
    !nonEmptyString(candidate.endpoint) ||
    !nonEmptyString(candidate.connectionKey)
  ) {
    return new ZeroYConnectionConfigError(
      'Each ZEROY_SITES item requires siteId, label, endpoint and connectionKey.',
    )
  }
  const endpoint = candidate.endpoint.trim().replace(/\/+$/, '')
  if (!URL.canParse(endpoint) || !/^https?:\/\//.test(endpoint)) {
    return new ZeroYConnectionConfigError(`Invalid zeroY endpoint for ${candidate.siteId}.`)
  }
  return {
    siteId: candidate.siteId.trim(),
    label: candidate.label.trim(),
    endpoint,
    grant: null,
    connectionKey: candidate.connectionKey.trim(),
    revoked: false,
  }
}

/**
 * Load headless/CI connections from ZEROY_SITES. Empty result = no sites.
 * Throws `ZeroYConnectionConfigError` when the JSON is invalid, not an array, or an item fails decode.
 * @param name - environment variable to parse; defaults to `ZEROY_SITES`.
 * @returns decoded connections in env order; empty when the variable is unset, blank, or `[]`.
 */
export async function loadSiteConnections(
  name: string = 'ZEROY_SITES',
): Promise<ReadonlyArray<SiteConnection>> {
  try {
    const raw = process.env[name]
    if (raw === undefined || raw.trim() === '') {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ZeroYConnectionConfigError('ZEROY_SITES must be valid JSON.')
    }

    if (!Array.isArray(parsed)) {
      throw new ZeroYConnectionConfigError('ZEROY_SITES must be an array.')
    }
    if (parsed.length === 0) return []

    const connections: SiteConnection[] = []
    const ids = new Set<string>()
    for (const value of parsed) {
      const connection = decodeConnection(value)
      if (connection instanceof ZeroYConnectionConfigError) throw connection
      if (ids.has(connection.siteId)) {
        throw new ZeroYConnectionConfigError(`Duplicate zeroY siteId ${connection.siteId}.`)
      }
      ids.add(connection.siteId)
      connections.push(connection)
    }
    return connections
  } catch (cause) {
    if (cause instanceof ZeroYConnectionConfigError) throw cause
    throw new ZeroYConnectionConfigError(`Could not load ZEROY_SITES: ${String(cause)}`)
  }
}

/**
 * Find a connection by `siteId`. Does not throw; missing sites return `ZeroYConnectionConfigError`.
 * @param connections - loaded site list.
 * @param siteId - routing key.
 * @returns the matching connection, or `ZeroYConnectionConfigError` when no site uses that key.
 */
export function connectionFor(
  connections: ReadonlyArray<SiteConnection>,
  siteId: string,
): SiteConnection | ZeroYConnectionConfigError {
  return (
    connections.find(connection => connection.siteId === siteId) ??
    new ZeroYConnectionConfigError(`Unknown zeroY siteId ${siteId}.`)
  )
}
