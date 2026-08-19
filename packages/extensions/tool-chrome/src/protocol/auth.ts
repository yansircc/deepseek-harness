/**
 * Bridge authentication: HMAC proof construction and verification, plus the
 * challenge registry. Ported from the pi-chrome extension
 * (`src/pi/bridge-authentication-node.ts` and `src/protocol/bridge-authentication.ts`)
 * with Effect replaced by plain functions and node:crypto.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/auth
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { BRIDGE_HEADERS, HMAC_AUTHENTICATION, PENDING_CHALLENGE_LIMIT } from './bridge-contract.ts'
import auth from './connector-auth.json' with { type: 'json' }

// ---------------------------------------------------------------------------
// Owner identity and headers
// ---------------------------------------------------------------------------

export const OWNER_PROTOCOL_FINGERPRINT_HEADER = BRIDGE_HEADERS.ownerProtocolFingerprint
export const OWNER_CLIENT_NONCE_HEADER = BRIDGE_HEADERS.ownerClientNonce
export const OWNER_BRIDGE_EPOCH_HEADER = BRIDGE_HEADERS.ownerBridgeEpoch
export const OWNER_REQUEST_NONCE_HEADER = BRIDGE_HEADERS.ownerRequestNonce
export const OWNER_BODY_SHA256_HEADER = BRIDGE_HEADERS.ownerBodySha256
export const OWNER_PROOF_HEADER = BRIDGE_HEADERS.ownerProof

export interface BridgeOwnerIdentity {
  readonly credential: string
  readonly protocolFingerprint: string
}

// ---------------------------------------------------------------------------
// Connector headers and identity
// ---------------------------------------------------------------------------

export const CONNECTOR_ID_HEADER = auth.headers.id
export const CONNECTOR_EXTENSION_ID_HEADER = auth.headers.extensionId
export const CONNECTOR_CLIENT_NONCE_HEADER = auth.headers.clientNonce
export const CONNECTOR_BRIDGE_EPOCH_HEADER = auth.headers.bridgeEpoch
export const CONNECTOR_REQUEST_NONCE_HEADER = auth.headers.requestNonce
export const CONNECTOR_BODY_SHA256_HEADER = auth.headers.bodySha256
export const CONNECTOR_PROOF_HEADER = auth.headers.proof

export interface ConnectorProofIdentity {
  readonly connectorId: string
  readonly extensionId: string
  readonly extensionDisplayVersion: string
  readonly protocolFingerprint: string
}

// ---------------------------------------------------------------------------
// HMAC primitives
// ---------------------------------------------------------------------------

/** Whether a string is a 64-char lowercase hex SHA-256 token. */
export const isHex256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value)

export const nodeHmacProof = (credential: string, message: string): string =>
  createHmac(HMAC_AUTHENTICATION.digest, Buffer.from(credential, 'hex'))
    .update(message)
    .digest('hex')

const proofMatches = (actual: string, expected: string): boolean =>
  isHex256(actual) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))

export const freshAuthenticationToken = (): string => randomBytes(32).toString('hex')

export const hashBridgeRequestBody = (body: string): string =>
  createHash('sha256').update(body, 'utf8').digest('hex')

// ---------------------------------------------------------------------------
// Proof message construction (canonical JSON arrays)
// ---------------------------------------------------------------------------

export type BridgeRequestChallenge = {
  readonly bridgeEpoch: string
  readonly requestNonce: string
}

export type HmacAuthenticationDomain = keyof typeof HMAC_AUTHENTICATION.domains

const canonical = (parts: ReadonlyArray<string>): string => JSON.stringify(parts)

export const serverProofMessage = (
  domain: HmacAuthenticationDomain,
  identity: ReadonlyArray<string>,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
  serverProtocolFingerprint: string,
): string =>
  canonical([
    HMAC_AUTHENTICATION.domains[domain],
    String(HMAC_AUTHENTICATION.algorithmVersion),
    ...identity,
    clientNonce,
    challenge.bridgeEpoch,
    challenge.requestNonce,
    serverProtocolFingerprint,
  ])

export const requestProofMessage = (
  domain: HmacAuthenticationDomain,
  identity: ReadonlyArray<string>,
  challenge: BridgeRequestChallenge,
  clientProtocolFingerprint: string,
  method: string,
  path: string,
  bodyHash: string,
): string =>
  canonical([
    HMAC_AUTHENTICATION.domains[domain],
    String(HMAC_AUTHENTICATION.algorithmVersion),
    ...identity,
    challenge.bridgeEpoch,
    challenge.requestNonce,
    clientProtocolFingerprint,
    method,
    path,
    bodyHash,
  ])

const connectorProofIdentity = (identity: ConnectorProofIdentity): ReadonlyArray<string> => [
  identity.connectorId,
  identity.extensionId,
  identity.extensionDisplayVersion,
  identity.protocolFingerprint,
]

// ---------------------------------------------------------------------------
// Owner proofs
// ---------------------------------------------------------------------------

export const ownerServerProof = (
  identity: BridgeOwnerIdentity,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
): string =>
  nodeHmacProof(
    identity.credential,
    serverProofMessage(
      'ownerServerProof',
      [],
      clientNonce,
      challenge,
      identity.protocolFingerprint,
    ),
  )

export const hasValidOwnerServerProof = (
  identity: BridgeOwnerIdentity,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
  proof: string,
): boolean => proofMatches(proof, ownerServerProof(identity, clientNonce, challenge))

export type OwnerRequestProofInput = BridgeRequestChallenge & {
  readonly method: string
  readonly path: string
  readonly bodyHash: string
}

export const ownerRequestProof = (
  identity: BridgeOwnerIdentity,
  input: OwnerRequestProofInput,
): string =>
  nodeHmacProof(
    identity.credential,
    requestProofMessage(
      'ownerRequestProof',
      [],
      input,
      identity.protocolFingerprint,
      input.method,
      input.path,
      input.bodyHash,
    ),
  )

export const hasValidOwnerRequestProof = (
  identity: BridgeOwnerIdentity,
  input: OwnerRequestProofInput,
  proof: string,
): boolean => proofMatches(proof, ownerRequestProof(identity, input))

// ---------------------------------------------------------------------------
// Connector proofs
// ---------------------------------------------------------------------------

export const connectorServerProofMessage = (
  domain: Extract<HmacAuthenticationDomain, 'connectorServerProof'>,
  identity: ConnectorProofIdentity,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
  serverProtocolFingerprint: string,
): string =>
  serverProofMessage(
    domain,
    connectorProofIdentity(identity),
    clientNonce,
    challenge,
    serverProtocolFingerprint,
  )

export const connectorRequestProofMessage = (
  domain: Extract<HmacAuthenticationDomain, 'connectorRequestProof'>,
  identity: ConnectorProofIdentity,
  challenge: BridgeRequestChallenge,
  method: string,
  path: string,
  bodyHash: string,
): string =>
  requestProofMessage(
    domain,
    connectorProofIdentity(identity),
    challenge,
    identity.protocolFingerprint,
    method,
    path,
    bodyHash,
  )

export const connectorServerProof = (
  identity: ConnectorProofIdentity,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
  serverProtocolFingerprint: string,
): string =>
  nodeHmacProof(
    identity.protocolFingerprint === '' ? '' : connectorSecret(identity),
    connectorServerProofMessage(
      'connectorServerProof',
      identity,
      clientNonce,
      challenge,
      serverProtocolFingerprint,
    ),
  )

/** Connector secret is not part of the public identity; derived from connectorId by convention. */
const connectorSecret = (_identity: ConnectorProofIdentity): string => ''

// ---------------------------------------------------------------------------
// Challenge registry
// ---------------------------------------------------------------------------

export type BridgeChallengeScope = 'owner' | 'connector'

const BRIDGE_CHALLENGE_SCOPES = ['owner', 'connector'] as const satisfies ReadonlyArray<BridgeChallengeScope>

export type BridgeRequestProofHeaders = BridgeRequestChallenge & {
  readonly bodyHash: string
  readonly proof: string
}

export type BridgeChallengeAdmission =
  | { readonly _tag: 'Accepted'; readonly authentication: BridgeRequestProofHeaders }
  | { readonly _tag: 'Malformed' }
  | { readonly _tag: 'Unavailable' }

export class BridgeChallengeRegistry {
  private readonly pending = new Map<string, number>()

  constructor(
    private readonly limit: number,
    private readonly ttlMs: number,
    private readonly generateToken: () => string = freshAuthenticationToken,
  ) {}

  issue(now: number): string {
    this.prune(now)
    while (this.pending.size >= this.limit) {
      const oldest = this.pending.keys().next().value
      if (oldest === undefined) break
      this.pending.delete(oldest)
    }
    let requestNonce = this.generateToken()
    while (this.pending.has(requestNonce)) requestNonce = this.generateToken()
    this.pending.set(requestNonce, now + this.ttlMs)
    return requestNonce
  }

  consume(requestNonce: string, now: number): boolean {
    this.prune(now)
    if (!this.pending.has(requestNonce)) return false
    this.pending.delete(requestNonce)
    return true
  }

  pruneAndCount(now: number): number {
    this.prune(now)
    return this.pending.size
  }

  clear(): void {
    this.pending.clear()
  }

  private prune(now: number): void {
    for (const [requestNonce, expiresAt] of this.pending) {
      if (expiresAt <= now) this.pending.delete(requestNonce)
    }
  }
}

export class BridgeAuthenticationSession {
  readonly bridgeEpoch = freshAuthenticationToken()
  private readonly challenges = Object.fromEntries(
    BRIDGE_CHALLENGE_SCOPES.map(scope => [
      scope,
      new BridgeChallengeRegistry(PENDING_CHALLENGE_LIMIT, 5_000),
    ]),
  ) as Record<BridgeChallengeScope, BridgeChallengeRegistry>

  issue(scope: BridgeChallengeScope, now: number): BridgeRequestChallenge {
    return {
      bridgeEpoch: this.bridgeEpoch,
      requestNonce: this.challenges[scope].issue(now),
    }
  }

  authorize(
    scope: BridgeChallengeScope,
    authentication: BridgeRequestProofHeaders,
    now: number,
  ): BridgeChallengeAdmission {
    if (
      authentication.bridgeEpoch !== this.bridgeEpoch ||
      !isHex256(authentication.requestNonce) ||
      !isHex256(authentication.bodyHash)
    ) {
      return { _tag: 'Malformed' }
    }
    return this.challenges[scope].consume(authentication.requestNonce, now)
      ? { _tag: 'Accepted', authentication }
      : { _tag: 'Unavailable' }
  }

  revoke(scope: BridgeChallengeScope, requestNonce: string, now: number): void {
    this.challenges[scope].consume(requestNonce, now)
  }
}

// ---------------------------------------------------------------------------
// Protocol contract (for the fingerprint)
// ---------------------------------------------------------------------------

const protocolContractChallenge = {
  bridgeEpoch: 'bridge-epoch',
  requestNonce: 'request-nonce',
} as const
const protocolContractConnector = {
  connectorId: 'connector-id',
  extensionId: 'extension-id',
  extensionDisplayVersion: 'extension-display-version',
  protocolFingerprint: 'client-protocol-fingerprint',
} as const

export const authenticationMessageProtocolContract = {
  ownerServerProof: serverProofMessage(
    'ownerServerProof',
    [],
    'client-nonce',
    protocolContractChallenge,
    'server-protocol-fingerprint',
  ),
  ownerRequestProof: requestProofMessage(
    'ownerRequestProof',
    [],
    protocolContractChallenge,
    'client-protocol-fingerprint',
    'METHOD',
    '/path',
    'body-hash',
  ),
  connectorServerProof: connectorServerProofMessage(
    'connectorServerProof',
    protocolContractConnector as unknown as ConnectorProofIdentity,
    'client-nonce',
    protocolContractChallenge,
    'server-protocol-fingerprint',
  ),
  connectorRequestProof: connectorRequestProofMessage(
    'connectorRequestProof',
    protocolContractConnector as unknown as ConnectorProofIdentity,
    protocolContractChallenge,
    'METHOD',
    '/path',
    'body-hash',
  ),
} as const
