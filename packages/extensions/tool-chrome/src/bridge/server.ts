/**
 * The bridge HTTP server: a local Node HTTP server that (a) accepts owner
 * commands from the DSH agent and (b) serves the Chrome extension's connector
 * handshake/poll/result routes. Ported from the pi-chrome extension
 * (`src/pi/node-bridge.ts`) with Effect replaced by plain async/await.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/server
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { CommandBroker } from './broker.ts'
import {
  BridgeBindFailed,
  BridgeUnavailable,
  ProtocolFailure,
  messageOf,
} from './errors.ts'
import {
  BridgeAuthenticationSession,
  BridgeOwnerIdentity,
  CONNECTOR_BODY_SHA256_HEADER,
  CONNECTOR_BRIDGE_EPOCH_HEADER,
  CONNECTOR_CLIENT_NONCE_HEADER,
  CONNECTOR_EXTENSION_ID_HEADER,
  CONNECTOR_PROOF_HEADER,
  CONNECTOR_REQUEST_NONCE_HEADER,
  OWNER_BODY_SHA256_HEADER,
  OWNER_BRIDGE_EPOCH_HEADER,
  OWNER_CLIENT_NONCE_HEADER,
  OWNER_PROOF_HEADER,
  OWNER_PROTOCOL_FINGERPRINT_HEADER,
  OWNER_REQUEST_NONCE_HEADER,
  connectorServerProofMessage,
  connectorRequestProofMessage,
  hasValidOwnerRequestProof,
  isHex256,
  nodeHmacProof,
  ownerServerProof,
  hashBridgeRequestBody,
  type BridgeRequestChallenge,
} from '../protocol/auth.ts'
import {
  BRIDGE_ALLOWED_METHODS,
  INCOMING_CONNECTION_LIMIT,
  INCOMING_HEADERS_DEADLINE_MS,
  INCOMING_REQUEST_DEADLINE_MS,
  POLL_WAIT_DEADLINE_MS,
  REQUEST_BODY_TOO_LARGE_STATUS,
  isOwnerBridgeRouteName,
  requestBodyLimitForRoute,
  resolveBridgeRoute,
  type ConnectorAuthenticatedRouteName,
  type OwnerBridgeRouteName,
} from '../protocol/bridge-contract.ts'
import { protocolFingerprint } from '../protocol/fingerprint.ts'
import type {
  BridgeAuthenticationHandshake,
  BridgeStatusResponse,
  ConnectorStatus,
  ForwardResponse,
  PollResponse,
  ProfileConnector,
  PublicConnector,
  SessionContext,
  WireDomainRequest,
  WireResult,
} from '../protocol/schema.ts'
import { EXTENSION_PACKAGE_ID } from './extension-package.ts'
import { CONNECTOR_ID_HEADER } from '../protocol/connector-auth.ts'
import { toWireBridgeFailure } from './codec.ts'

// ---------------------------------------------------------------------------
// Connector owner registry
// ---------------------------------------------------------------------------

class ConnectorOwner {
  private readonly connectors = new Map<string, ProfileConnector>()

  /** Adopt a presented connector identity (handshake). */
  adopt(presented: ProfileConnector): ProfileConnector {
    const existing = this.connectors.get(presented.connectorId)
    if (existing !== undefined) {
      // Same connectorId re-handshaking is allowed (extension reload).
      this.connectors.set(presented.connectorId, presented)
      return presented
    }
    this.connectors.set(presented.connectorId, presented)
    return presented
  }

  authorizedConnector(connectorId: string): ProfileConnector | undefined {
    return this.connectors.get(connectorId)
  }

  drop(connectorId: string): void {
    this.connectors.delete(connectorId)
  }

  list(): ProfileConnector[] {
    return [...this.connectors.values()]
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const readBody = (request: IncomingMessage, limitBytes: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let receivedBytes = 0
    const onData = (chunk: Buffer | string): void => {
      const buffer = Buffer.from(chunk)
      receivedBytes += buffer.byteLength
      if (receivedBytes > limitBytes) {
        request.removeListener('data', onData)
        request.removeListener('end', onEnd)
        reject(
          new ProtocolFailure(
            `HTTP request body exceeds ${limitBytes} bytes`,
            { status: REQUEST_BODY_TOO_LARGE_STATUS, receivedBytes, limitBytes },
          ),
        )
        return
      }
      chunks.push(buffer)
    }
    const onEnd = (): void => resolve(Buffer.concat(chunks).toString('utf8'))
    const onError = (cause: unknown): void =>
      reject(new ProtocolFailure('Failed to read HTTP body', cause))
    request.on('data', onData)
    request.once('end', onEnd)
    request.once('error', onError)
  })

const parseBridgeRequestPath = (request: IncomingMessage, baseUrl: string): string => {
  try {
    return new URL(request.url ?? '/', baseUrl).pathname
  } catch (cause) {
    throw new ProtocolFailure('HTTP request target is malformed', cause)
  }
}

const writeJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })
  response.end(JSON.stringify(body))
}

const requestFailureHttpStatus = (error: unknown, fallback: number): number => {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    error._tag === 'ProtocolFailure'
  ) {
    const cause = (error as { cause?: unknown }).cause as
      | { status?: number }
      | undefined
    if (cause?.status !== undefined) return cause.status
  }
  return fallback
}

const expectedOrigin = `chrome-extension://${EXTENSION_PACKAGE_ID}`

const hasExpectedExtensionOrigin = (request: IncomingMessage): boolean =>
  request.headers.origin === expectedOrigin

const isExpectedExtensionRequest = (request: IncomingMessage): boolean => {
  const origin = request.headers.origin
  return (
    request.headers[CONNECTOR_EXTENSION_ID_HEADER] === EXTENSION_PACKAGE_ID &&
    (origin === undefined || origin === expectedOrigin)
  )
}

const extensionHeaders = (request: IncomingMessage): Record<string, string> =>
  hasExpectedExtensionOrigin(request)
    ? {
      'access-control-allow-origin': expectedOrigin,
      'access-control-allow-methods': BRIDGE_ALLOWED_METHODS,
      'access-control-allow-headers': [
        'content-type',
        CONNECTOR_EXTENSION_ID_HEADER,
        CONNECTOR_CLIENT_NONCE_HEADER,
        CONNECTOR_BRIDGE_EPOCH_HEADER,
        CONNECTOR_REQUEST_NONCE_HEADER,
        CONNECTOR_BODY_SHA256_HEADER,
        CONNECTOR_PROOF_HEADER,
      ].join(','),
      'access-control-allow-private-network': 'true',
      vary: 'origin',
    }
    : {}

const isLocalProcessRequest = (request: IncomingMessage): boolean =>
  !request.headers.origin && !request.headers['sec-fetch-site']

const parseJsonBody = <T>(label: string, text: string): T => {
  try {
    return JSON.parse(text) as T
  } catch (cause) {
    throw new ProtocolFailure(`Invalid ${label}`, cause)
  }
}

// ---------------------------------------------------------------------------
// Bridge server
// ---------------------------------------------------------------------------

/** Listen address, extension display version, and optional protocol fingerprint for a local bridge HTTP server. */
export interface BridgeServerOptions {
  readonly host: string
  readonly port: number
  readonly displayVersion: () => string
  readonly agentDir?: string
  /**
   * Optional protocol fingerprint override. Defaults to the fingerprint
   * computed from this package's protocol contracts. Set it to a specific
   * protocol-version fingerprint (e.g. the one baked into a prebuilt Chrome
   * extension) to declare which protocol version this bridge implements.
   */
  readonly protocolFingerprint?: string
}

/**
 * Local HTTP bridge that owns the command broker, connector bind slot, and
 * owner/connector HMAC sessions. `start` binds the listen address; `stop`
 * closes sockets and rejects in-flight mailbox work. A stopped instance
 * cannot be restarted.
 */
export class BridgeServer {
  private server: Server | undefined
  private authentication: BridgeAuthenticationSession | undefined
  private broker: CommandBroker | undefined
  private connectors = new ConnectorOwner()
  private ownerIdentity: BridgeOwnerIdentity | undefined
  private readonly fingerprint: string
  private closed = false

  constructor(private readonly options: BridgeServerOptions) {
    this.fingerprint = options.protocolFingerprint ?? protocolFingerprint()
  }

  /** Origin `http://{host}:{port}` this instance listens on. */
  get url(): string {
    return `http://${this.options.host}:${this.options.port}`
  }

  /** Extension id, display version, and protocol fingerprint the connector must present. */
  get extensionExpectation(): {
    extensionId: string
    displayVersion: string
    protocolFingerprint: string
  } {
    return {
      extensionId: EXTENSION_PACKAGE_ID,
      displayVersion: this.options.displayVersion(),
      protocolFingerprint: this.fingerprint,
    }
  }

  /**
   * Load (or create) the owner credential. `credential` is injected by the plugin.
   * @param credential - shared secret the owner client must prove; replaces any prior identity.
   */
  setOwnerCredential(credential: string): void {
    this.ownerIdentity = { credential, protocolFingerprint: this.fingerprint }
  }

  /**
   * Bind the listen address and admit owner/connector requests.
   * No-op when already listening. A raced `stop` closes the socket before it is retained.
   * @throws BridgeUnavailable when the instance was already stopped; BridgeBindFailed when the address cannot be bound.
   */
  async start(): Promise<void> {
    if (this.closed) throw new BridgeUnavailable('Chrome bridge is closed and cannot be restarted')
    if (this.server !== undefined) return
    const authentication = new BridgeAuthenticationSession()
    this.authentication = authentication
    this.broker = await CommandBroker.make()
    const server = createServer((request, response) => {
      void this.runRequest(request, response)
    })
    server.requestTimeout = INCOMING_REQUEST_DEADLINE_MS
    server.headersTimeout = INCOMING_HEADERS_DEADLINE_MS
    server.maxConnections = INCOMING_CONNECTION_LIMIT
    await new Promise<void>((resolve, reject) => {
      const onError = (cause: NodeJS.ErrnoException): void => {
        if ((cause as NodeJS.ErrnoException & { code?: string }).code === 'EADDRINUSE') {
          // Another bridge owns this port (e.g. Pipee). Fall back to client mode
          // is not supported here; surface a clear error.
          reject(
            new BridgeBindFailed(
              `Failed to bind ${this.url}: address already in use`,
              cause,
            ),
          )
          return
        }
        reject(new BridgeBindFailed(`Failed to bind ${this.url}`, cause))
      }
      server.once('error', onError)
      server.listen(this.options.port, this.options.host, () => {
        server.off('error', onError)
        // Dispose can win the race against listen; do not keep a socket that
        // no owner will stop.
        if (this.closed) {
          server.close(() => resolve())
          server.closeAllConnections()
          return
        }
        this.server = server
        resolve()
      })
    })
  }

  /**
   * Close the listen socket, stop the broker, and refuse later `start`.
   * Safe to call more than once.
   */
  async stop(): Promise<void> {
    this.closed = true
    await this.broker?.stop()
    if (this.server !== undefined) {
      const server = this.server
      this.server = undefined
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
        server.closeAllConnections()
      })
    }
  }

  /**
   * Snapshot of listen URL, server mode, expected extension identity, and the
   * currently leased connector when one is connected.
   * @returns status payload the owner `/status` route returns.
   */
  status(): BridgeStatusResponse {
    const expectation = this.extensionExpectation
    const connector = this.statusOfConnector()
    return {
      url: this.url,
      mode: 'server',
      extensionExpectation: {
        extensionId: expectation.extensionId,
        displayVersion: expectation.displayVersion,
        protocolFingerprint: expectation.protocolFingerprint,
      },
      ...(connector === undefined ? {} : { connector }),
    }
  }

  private statusOfConnector(): ConnectorStatus | undefined {
    const broker = this.broker
    if (!broker) return undefined
    for (const profile of this.connectors.list()) {
      const status = broker.status(profile.connectorId)
      if (status.connected) {
        return {
          connectorId: status.connectorId,
          extensionId: profile.extensionId,
          extensionDisplayVersion: profile.extensionDisplayVersion,
          protocolFingerprint: profile.protocolFingerprint,
          label: profile.label,
          connected: true,
          ...(status.lastSeenAt === undefined ? {} : { lastSeenAt: status.lastSeenAt }),
          queuedCommands: status.queuedCommands,
          pendingCommands: status.pendingCommands,
        }
      }
    }
    return undefined
  }

  // -------------------------------------------------------------------------
  // Request handling
  // -------------------------------------------------------------------------

  private async runRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      await this.handle(request, response)
    } catch (error) {
      if (response.headersSent) return
      writeJson(response, requestFailureHttpStatus(error, 500), {
        ok: false,
        error: messageOf(error),
      })
    }
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = parseBridgeRequestPath(request, this.url)
    const headers = extensionHeaders(request)
    const resolution = resolveBridgeRoute(request.method, path)
    if (resolution._tag === 'NotFound') {
      writeJson(response, 404, { ok: false, error: 'not found' })
      return
    }
    if (resolution._tag === 'Ambiguous') {
      writeJson(response, 500, {
        ok: false,
        error: `ambiguous bridge route: ${resolution.names.join(', ')}`,
      })
      return
    }
    const routeName = resolution.name

    // Owner routes require owner authorization (except the handshake).
    let ownerBody = ''
    if (isOwnerBridgeRouteName(routeName) && routeName !== 'ownerHandshake') {
      const authorized = await this.authorizeOwnerRequest(request, response, path)
      if (!authorized) return
      const body = await this.readOwnerBody(request, response, routeName, authorized)
      if (body === undefined) return
      ownerBody = body
    }

    switch (routeName) {
      case 'preflight':
        if (!isExpectedExtensionRequest(request)) {
          writeJson(response, 403, { ok: false, error: 'extension origin not allowed' }, headers)
          return
        }
        writeJson(response, 200, { ok: true }, headers)
        return
      case 'ownerHandshake':
        await this.handleOwnerHandshake(request, response)
        return
      case 'connectorHandshake':
        await this.handleConnectorHandshake(request, response, headers)
        return
      case 'status':
      case 'statusWait':
        writeJson(response, 200, this.status())
        return
      case 'command':
        await this.handleOwnerCommand(ownerBody, response)
        return
      case 'poll':
        await this.handleConnectorPoll(request, response, headers, path)
        return
      case 'result':
        await this.handleConnectorResult(request, response, headers, path)
        return
      default:
        writeJson(response, 404, { ok: false, error: 'not found' })
    }
  }

  // -------------------------------------------------------------------------
  // Owner routes
  // -------------------------------------------------------------------------

  private identifyOwnerRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): BridgeOwnerIdentity | undefined {
    if (!isLocalProcessRequest(request)) {
      writeJson(response, 403, { ok: false, error: 'owner route is local-only' })
      return undefined
    }
    const identity = this.ownerIdentity
    if (!identity) {
      writeJson(response, 503, { ok: false, error: 'bridge owner identity is not loaded' })
      return undefined
    }
    if (request.headers[OWNER_PROTOCOL_FINGERPRINT_HEADER] !== identity.protocolFingerprint) {
      writeJson(response, 409, {
        ok: false,
        error: `bridge owner requires protocol fingerprint ${identity.protocolFingerprint}`,
        expectedProtocolFingerprint: identity.protocolFingerprint,
      })
      return undefined
    }
    return identity
  }

  private async handleOwnerHandshake(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    await readBody(request, requestBodyLimitForRoute('ownerHandshake'))
    const identity = this.identifyOwnerRequest(request, response)
    if (!identity) return
    const clientNonce = String(request.headers[OWNER_CLIENT_NONCE_HEADER] ?? '')
    if (!isHex256(clientNonce)) {
      writeJson(response, 400, { ok: false, error: 'owner client nonce is missing or malformed' })
      return
    }
    const authentication = this.authentication
    if (!authentication) {
      writeJson(response, 503, { ok: false, error: 'bridge owner epoch is not initialized' })
      return
    }
    const challenge = authentication.issue('owner', Date.now())
    writeJson(response, 200, {
      bridgeDisplayVersion: this.options.displayVersion(),
      protocolFingerprint: this.fingerprint,
      ...challenge,
      proof: ownerServerProof(identity, clientNonce, challenge),
    } satisfies BridgeAuthenticationHandshake)
  }

  private authorizeOwnerRequest(
    request: IncomingMessage,
    response: ServerResponse,
    path: string,
  ): { expectedBodyHash: string } | undefined {
    const identity = this.identifyOwnerRequest(request, response)
    if (!identity) return undefined
    const proofHeaders = ownerProofHeaders(request)
    const authentication = this.authentication
    if (!authentication) {
      writeJson(response, 503, { ok: false, error: 'bridge owner is not active' })
      return undefined
    }
    const input = {
      bridgeEpoch: proofHeaders.bridgeEpoch,
      requestNonce: proofHeaders.requestNonce,
      method: request.method ?? '',
      path,
      bodyHash: proofHeaders.bodyHash,
    }
    const admission = authentication.authorize('owner', proofHeaders, Date.now())
    if (admission._tag === 'Malformed') {
      writeJson(response, 401, { ok: false, error: 'owner request proof is invalid' })
      return undefined
    }
    if (admission._tag === 'Unavailable') {
      writeJson(response, 401, {
        ok: false,
        error: 'owner request challenge is unavailable, expired, or already consumed',
      })
      return undefined
    }
    if (!hasValidOwnerRequestProof(identity, input, proofHeaders.proof)) {
      writeJson(response, 401, { ok: false, error: 'owner request proof is invalid' })
      return undefined
    }
    return { expectedBodyHash: proofHeaders.bodyHash }
  }

  private async readOwnerBody(
    request: IncomingMessage,
    response: ServerResponse,
    routeName: Exclude<OwnerBridgeRouteName, 'ownerHandshake'>,
    authorization: { expectedBodyHash: string },
  ): Promise<string | undefined> {
    const body = await readBody(request, requestBodyLimitForRoute(routeName))
    if (hashBridgeRequestBody(body) === authorization.expectedBodyHash) return body
    writeJson(response, 401, { ok: false, error: 'owner request body hash is invalid' })
    return undefined
  }

  private async handleOwnerCommand(body: string, response: ServerResponse): Promise<void> {
    const envelope = parseJsonBody<{
      session: SessionContext
      timeoutMs: number
      domain: string
      call: unknown
    }>('forward request', body)
    const { session, timeoutMs, domain, call } = envelope
    const request: WireDomainRequest = { domain: domain as WireDomainRequest['domain'], call: call as never }
    try {
      const value = await this.sendBound(request, session, timeoutMs)
      writeJson(response, 200, { ok: true, value: value as never } satisfies ForwardResponse)
    } catch (error) {
      writeJson(response, 504, { ok: false, error: toWireBridgeFailure(error) } satisfies ForwardResponse)
    }
  }

  private async sendBound(
    request: WireDomainRequest,
    session: SessionContext,
    timeoutMs: number,
  ): Promise<unknown> {
    const broker = this.broker
    if (!broker) throw new BridgeUnavailable('Chrome bridge is not started')
    const connector = this.connectors.list()[0]
    if (!connector) {
      throw new BridgeUnavailable('Chrome extension is not connected. Load the unpacked extension and retry.')
    }
    await broker.register(connector.connectorId)
    return broker.send(connector.connectorId, request, session, timeoutMs)
  }

  // -------------------------------------------------------------------------
  // Connector routes
  // -------------------------------------------------------------------------

  private async handleConnectorHandshake(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
  ): Promise<void> {
    const body = await readBody(request, requestBodyLimitForRoute('connectorHandshake'))
    const presented = parseJsonBody<ProfileConnector>('connector metadata', body)
    if (
      typeof presented.connectorId !== 'string' ||
      typeof presented.secret !== 'string' ||
      typeof presented.label !== 'string' ||
      typeof presented.extensionId !== 'string' ||
      typeof presented.extensionDisplayVersion !== 'string' ||
      typeof presented.protocolFingerprint !== 'string'
    ) {
      writeJson(response, 400, { ok: false, error: 'connector metadata is malformed' }, headers)
      return
    }
    const profile = this.connectors.adopt(presented)
    await this.broker?.register(profile.connectorId)
    const identified = this.identifyAuthorizedConnector(request, response, headers)
    if (!identified) return
    const clientNonce = String(request.headers[CONNECTOR_CLIENT_NONCE_HEADER] ?? '')
    if (!isHex256(clientNonce)) {
      writeJson(response, 400, { ok: false, error: 'connector client nonce is missing or malformed' }, headers)
      return
    }
    const authentication = this.authentication
    if (!authentication) {
      writeJson(response, 503, { ok: false, error: 'bridge authentication epoch is not initialized' }, headers)
      return
    }
    const challenge = authentication.issue('connector', Date.now())
    const message = connectorServerProofMessage(
      'connectorServerProof',
      identified.connector,
      clientNonce,
      challenge,
      this.fingerprint,
    )
    writeJson(
      response,
      200,
      {
        bridgeDisplayVersion: this.options.displayVersion(),
        protocolFingerprint: this.fingerprint,
        ...challenge,
        proof: nodeHmacProof(identified.profile.secret, message),
      },
      headers,
    )
  }

  private identifyAuthorizedConnector(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
  ): { profile: ProfileConnector; connector: PublicConnector } | undefined {
    const extensionId = String(request.headers[CONNECTOR_EXTENSION_ID_HEADER] ?? '')
    const connectorId = String(request.headers[CONNECTOR_ID_HEADER] ?? '')
    const profile = this.connectors.authorizedConnector(connectorId)
    if (!profile || profile.extensionId !== extensionId) {
      writeJson(response, 401, { ok: false, error: 'connector is not authenticated' }, headers)
      return undefined
    }
    return {
      profile,
      connector: {
        connectorId: profile.connectorId,
        extensionId: profile.extensionId,
        extensionDisplayVersion: profile.extensionDisplayVersion,
        protocolFingerprint: profile.protocolFingerprint,
        label: profile.label,
      },
    }
  }

  private authorizeConnectorRequest(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
    path: string,
  ): { connector: PublicConnector; expectedBodyHash: string } | undefined {
    const identified = this.identifyAuthorizedConnector(request, response, headers)
    if (!identified) return undefined
    const proofHeaders = connectorProofHeaders(request)
    const authentication = this.authentication
    if (!authentication) {
      writeJson(response, 503, { ok: false, error: 'bridge authentication session is not active' }, headers)
      return undefined
    }
    const challenge = {
      bridgeEpoch: proofHeaders.bridgeEpoch,
      requestNonce: proofHeaders.requestNonce,
    } satisfies BridgeRequestChallenge
    const message = connectorRequestProofMessage(
      'connectorRequestProof',
      identified.connector,
      challenge,
      request.method ?? '',
      path,
      proofHeaders.bodyHash,
    )
    const admission = authentication.authorize('connector', proofHeaders, Date.now())
    if (admission._tag === 'Malformed') {
      writeJson(response, 401, { ok: false, error: 'connector request proof is invalid' }, headers)
      return undefined
    }
    if (admission._tag === 'Unavailable') {
      writeJson(response, 401, { ok: false, error: 'connector challenge is unavailable, expired, or consumed' }, headers)
      return undefined
    }
    const expected = nodeHmacProof(identified.profile.secret, message)
    if (expected !== proofHeaders.proof) {
      writeJson(response, 401, { ok: false, error: 'connector request proof is invalid' }, headers)
      return undefined
    }
    return { connector: identified.connector, expectedBodyHash: proofHeaders.bodyHash }
  }

  private async readConnectorBody(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
    routeName: ConnectorAuthenticatedRouteName,
    expectedBodyHash: string,
  ): Promise<string | undefined> {
    const body = await readBody(request, requestBodyLimitForRoute(routeName))
    if (hashBridgeRequestBody(body) === expectedBodyHash) return body
    writeJson(response, 401, { ok: false, error: 'connector request body hash is invalid' }, headers)
    return undefined
  }

  private async handleConnectorPoll(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
    path: string,
  ): Promise<void> {
    const authorized = await this.authorizeConnectorRequest(request, response, headers, path)
    if (!authorized) return
    await this.handlePoll(authorized.connector, response, headers)
  }

  private async handleConnectorResult(
    request: IncomingMessage,
    response: ServerResponse,
    headers: Record<string, string>,
    path: string,
  ): Promise<void> {
    const authorized = await this.authorizeConnectorRequest(request, response, headers, path)
    if (!authorized) return
    const body = await this.readConnectorBody(
      request,
      response,
      headers,
      'result',
      authorized.expectedBodyHash,
    )
    if (body === undefined) return
    const wireResult = parseJsonBody<WireResult>('wire result', body)
    const accepted = (await this.broker?.complete(authorized.connector, wireResult)) ?? false
    writeJson(response, accepted ? 200 : 404, { ok: accepted })
  }

  private async handlePoll(
    connector: PublicConnector,
    response: ServerResponse,
    headers: Record<string, string>,
  ): Promise<void> {
    if (this.respondIfIncompatible(connector, response, headers)) return
    const broker = this.broker
    const command = broker
      ? await broker.next(connector, POLL_WAIT_DEADLINE_MS)
      : undefined
    const expectation = this.extensionExpectation
    const payload: PollResponse = command
      ? {
        type: 'command',
        command,
        expectedExtensionId: expectation.extensionId,
        expectedExtensionDisplayVersion: expectation.displayVersion,
        expectedProtocolFingerprint: expectation.protocolFingerprint,
      }
      : {
        type: 'none',
        expectedExtensionId: expectation.extensionId,
        expectedExtensionDisplayVersion: expectation.displayVersion,
        expectedProtocolFingerprint: expectation.protocolFingerprint,
      }
    writeJson(response, 200, payload, headers)
  }

  private respondIfIncompatible(
    connector: PublicConnector,
    response: ServerResponse,
    headers: Record<string, string>,
  ): boolean {
    const expectation = this.extensionExpectation
    if (
      connector.extensionId === expectation.extensionId &&
      connector.extensionDisplayVersion === expectation.displayVersion &&
      connector.protocolFingerprint === expectation.protocolFingerprint
    ) {
      return false
    }
    writeJson(
      response,
      200,
      {
        type: 'incompatible',
        expectedExtensionId: expectation.extensionId,
        expectedExtensionDisplayVersion: expectation.displayVersion,
        actualExtensionDisplayVersion: connector.extensionDisplayVersion,
        expectedProtocolFingerprint: expectation.protocolFingerprint,
        actualProtocolFingerprint: connector.protocolFingerprint,
      } satisfies PollResponse,
      headers,
    )
    return true
  }
}

// ---------------------------------------------------------------------------
// Proof header extraction
// ---------------------------------------------------------------------------

function ownerProofHeaders(request: IncomingMessage): BridgeRequestChallenge & {
  bodyHash: string
  proof: string
} {
  return {
    bridgeEpoch: String(request.headers[OWNER_BRIDGE_EPOCH_HEADER] ?? ''),
    requestNonce: String(request.headers[OWNER_REQUEST_NONCE_HEADER] ?? ''),
    bodyHash: String(request.headers[OWNER_BODY_SHA256_HEADER] ?? ''),
    proof: String(request.headers[OWNER_PROOF_HEADER] ?? ''),
  }
}

function connectorProofHeaders(request: IncomingMessage): BridgeRequestChallenge & {
  bodyHash: string
  proof: string
} {
  return {
    bridgeEpoch: String(request.headers[CONNECTOR_BRIDGE_EPOCH_HEADER] ?? ''),
    requestNonce: String(request.headers[CONNECTOR_REQUEST_NONCE_HEADER] ?? ''),
    bodyHash: String(request.headers[CONNECTOR_BODY_SHA256_HEADER] ?? ''),
    proof: String(request.headers[CONNECTOR_PROOF_HEADER] ?? ''),
  }
}
