/** Concrete loopback Chrome provider and connector HTTP transport. */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  ChromeBuildId,
  ChromeConnectorId,
  ChromeOperationRevision,
  ChromeProviderId,
  type ChromeCommand,
  type ChromeHealth,
  type ChromeJsonValue,
} from '@deepseek-ai/dsh-chrome-protocol'
import type { ChromeExecutionContext, ChromeProvider } from '@deepseek-ai/dsh-chrome'
import type { ResolvedConfig } from './config.ts'
import { decodeProfileConnector, decodeWireResult } from './codec.ts'
import { LocalCommandBroker } from './broker.ts'
import { ConnectorOwner } from './connector-owner.ts'
import type { ProfileConnector } from './types.ts'
import {
  BridgeAuthenticationSession,
  CONNECTOR_BODY_SHA256_HEADER,
  CONNECTOR_BRIDGE_EPOCH_HEADER,
  CONNECTOR_CLIENT_NONCE_HEADER,
  CONNECTOR_PROOF_HEADER,
  CONNECTOR_REQUEST_NONCE_HEADER,
  connectorRequestProofMessage,
  connectorServerProofMessage,
  nodeHmacProof,
  hashBridgeRequestBody,
} from './protocol/auth.ts'
import {
  CONNECTOR_DISPLAY_VERSION_METADATA_HEADER,
  CONNECTOR_EXTENSION_ID_HEADER,
  CONNECTOR_ID_HEADER,
  CONNECTOR_PROTOCOL_FINGERPRINT_HEADER,
} from './protocol/connector-auth.ts'

const BODY_LIMIT = 20 * 1024 * 1024
const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk as Uint8Array)
    size += buffer.byteLength
    if (size > BODY_LIMIT) throw new Error(`connector request exceeds ${BODY_LIMIT} bytes`)
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}
const json = (response: ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  response.end(JSON.stringify(body))
}

/** Extension artifact identity the provider advertises in health. */
export interface ExtensionArtifactMetadata {
  readonly extensionId: string
  readonly displayVersion: string
  readonly protocolFingerprint: string
  readonly kernelBuildId: string
  readonly operationRevision: string
}

/** Loopback HTTP provider used by the Chrome extension connector. */
export class LocalChromeProvider implements ChromeProvider {
  readonly id = ChromeProviderId('local')
  private readonly broker: LocalCommandBroker
  private readonly connectors = new ConnectorOwner()
  private readonly authentication = new BridgeAuthenticationSession()
  private server: Server | undefined
  private closePromise: Promise<void> | undefined
  private state: 'starting' | 'listening' | 'failed' | 'stopped' = 'starting'

  constructor(
    private readonly config: ResolvedConfig,
    private readonly artifact: ExtensionArtifactMetadata,
  ) {
    this.broker = new LocalCommandBroker(config.maxAdmittedCommands, config.commandTimeoutMs)
  }

  /** Bind loopback connector routes; failure rejects provider publication. */
  async start(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted()
    if (this.server) return
    const server = createServer((request, response) => { void this.handle(request, response) })
    await new Promise<void>((resolve, reject) => {
      const abort = (): void => { server.close(); reject(signal.reason) }
      const error = (cause: Error): void => { signal.removeEventListener('abort', abort); reject(cause) }
      server.once('error', error)
      signal.addEventListener('abort', abort, { once: true })
      server.listen(this.config.port, this.config.host, () => {
        signal.removeEventListener('abort', abort)
        server.off('error', error)
        this.server = server
        this.state = 'listening'
        resolve()
      })
    }).catch((error: unknown) => { this.state = 'failed'; throw error })
  }

  /** Submit directly to the in-process broker; no owner self-HTTP hop exists. */
  execute(context: ChromeExecutionContext, command: ChromeCommand): Promise<ChromeJsonValue> {
    return this.broker.send(context.owner, command, context.signal)
  }

  /** Fresh secret-free provider health. */
  async status(signal?: AbortSignal): Promise<ChromeHealth> {
    signal?.throwIfAborted()
    const connector = this.connectors.status()
    const counts = this.broker.status()
    const connected = connector.lastSeenAt !== undefined && Date.now() - connector.lastSeenAt < this.config.connectorLeaseMs
    return {
      kernel: this.state,
      connector: connector.connector === undefined ? 'absent' : connected ? 'polling' : 'stale',
      runtime: counts.current === undefined ? 'idle' : 'executing',
      kernelProtocolVersion: '1',
      kernelBuildId: ChromeBuildId(this.artifact.kernelBuildId),
      operationRevision: ChromeOperationRevision(this.artifact.operationRevision),
      ...(connector.connector === undefined ? {} : {
        connectorStatus: {
          id: connector.connector.connectorId,
          label: connector.connector.label,
          connected,
          ...(connector.lastSeenAt === undefined ? {} : { lastSeenAt: connector.lastSeenAt }),
          queuedCommands: counts.queued,
          pendingCommands: counts.pending,
        },
      }),
      ...(counts.current === undefined ? {} : {
        currentCommand: {
          id: counts.current.id,
          phase: counts.current.phase,
          operation: 'connector-command',
        },
      }),
    }
  }

  /** Stop admission, settle broker work, close sockets, and resolve at quiescence. */
  async close(_reason: string): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.state = 'stopped'
    this.closePromise = (async () => {
      await this.broker.close()
      const server = this.server
      this.server = undefined
      if (server) await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections() })
    })()
    return this.closePromise
  }

  private connectorFor(request: IncomingMessage): ProfileConnector | undefined {
    const raw = request.headers[CONNECTOR_ID_HEADER]
    if (typeof raw !== 'string') return undefined
    return this.connectors.authorize(ChromeConnectorId(raw))
  }

  private authenticateConnectorRequest(
    request: IncomingMessage,
    profile: ProfileConnector,
    path: string,
    body: string,
  ): boolean {
    const bridgeEpoch = String(request.headers[CONNECTOR_BRIDGE_EPOCH_HEADER] ?? '')
    const requestNonce = String(request.headers[CONNECTOR_REQUEST_NONCE_HEADER] ?? '')
    const bodyHash = String(request.headers[CONNECTOR_BODY_SHA256_HEADER] ?? '')
    const proof = String(request.headers[CONNECTOR_PROOF_HEADER] ?? '')
    const admission = this.authentication.authorize(
      'connector',
      { bridgeEpoch, requestNonce, bodyHash, proof },
      Date.now(),
    )
    if (admission._tag !== 'Accepted' || bodyHash !== hashBridgeRequestBody(body)) return false
    const expected = nodeHmacProof(
      profile.secret,
      connectorRequestProofMessage(
        'connectorRequestProof',
        profile,
        { bridgeEpoch, requestNonce },
        request.method ?? '',
        path,
        bodyHash,
      ),
    )
    return proof === expected
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const path = new URL(request.url ?? '/', `http://${this.config.host}:${this.config.port}`).pathname
      if (request.method === 'POST' && path === '/connector/handshake') {
        const presented = decodeProfileConnector(await readBody(request))
        const clientNonce = String(request.headers[CONNECTOR_CLIENT_NONCE_HEADER] ?? '')
        const headerId = String(request.headers[CONNECTOR_ID_HEADER] ?? '')
        const headerExtensionId = String(request.headers[CONNECTOR_EXTENSION_ID_HEADER] ?? '')
        const headerDisplayVersion = String(request.headers[CONNECTOR_DISPLAY_VERSION_METADATA_HEADER] ?? '')
        const headerFingerprint = String(request.headers[CONNECTOR_PROTOCOL_FINGERPRINT_HEADER] ?? '')
        if (
          presented.extensionId !== this.artifact.extensionId ||
          presented.protocolFingerprint !== this.artifact.protocolFingerprint ||
          headerId !== presented.connectorId ||
          headerExtensionId !== presented.extensionId ||
          headerDisplayVersion !== presented.extensionDisplayVersion ||
          headerFingerprint !== presented.protocolFingerprint ||
          !/^[a-f0-9]{64}$/.test(clientNonce)
        ) {
          json(response, 409, { ok: false, error: 'connector artifact is incompatible' })
          return
        }
        const challenge = this.authentication.issue('connector', Date.now())
        const proof = nodeHmacProof(
          presented.secret,
          connectorServerProofMessage(
            'connectorServerProof',
            presented,
            clientNonce,
            challenge,
            this.artifact.protocolFingerprint,
          ),
        )
        this.connectors.adoptAfterProof(presented, presented.secret)
        json(response, 200, {
          bridgeDisplayVersion: this.artifact.displayVersion,
          protocolFingerprint: this.artifact.protocolFingerprint,
          ...challenge,
          proof,
        })
        return
      }
      const connector = this.connectorFor(request)
      if (!connector) { json(response, 401, { ok: false, error: 'connector is not authenticated' }); return }
      if (request.method === 'GET' && path === '/next') {
        if (!this.authenticateConnectorRequest(request, connector, path, '')) {
          json(response, 401, { ok: false, error: 'connector proof is invalid' })
          return
        }
        this.connectors.touch(connector.connectorId, Date.now())
        const { secret: _secret, ...publicConnector } = connector
        const poll = await this.broker.next(publicConnector, this.config.pollWaitMs)
        json(response, 200, {
          ...poll,
          expectedExtensionId: this.artifact.extensionId,
          expectedExtensionDisplayVersion: this.artifact.displayVersion,
          expectedProtocolFingerprint: this.artifact.protocolFingerprint,
        })
        return
      }
      if (request.method === 'POST' && path === '/result') {
        const body = await readBody(request)
        if (!this.authenticateConnectorRequest(request, connector, path, body)) {
          json(response, 401, { ok: false, error: 'connector proof is invalid' })
          return
        }
        const result = decodeWireResult(body)
        this.connectors.touch(connector.connectorId, Date.now())
        const { secret: _secret, ...publicConnector } = connector
        const disposition = this.broker.complete(publicConnector, result)
        json(response, disposition === 'unknown' ? 404 : 200, { ok: disposition !== 'unknown', disposition })
        return
      }
      json(response, 404, { ok: false, error: 'not found' })
    } catch (error) {
      json(response, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
}

/** Derive the extension owner key from an exact Agent for testing and adapters.
 * @param owner - Exact initiating Agent.
 * @returns Stable provider-local owner key.
 */
export const ownerKey = (owner: Agent): string => `agent:${owner.id}`
