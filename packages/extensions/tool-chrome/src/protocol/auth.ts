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

/** HTTP header name for the owner's protocol-fingerprint hex on authenticated owner requests. */
export const OWNER_PROTOCOL_FINGERPRINT_HEADER = BRIDGE_HEADERS.ownerProtocolFingerprint
/** HTTP header name for the owner's handshake client nonce. */
export const OWNER_CLIENT_NONCE_HEADER = BRIDGE_HEADERS.ownerClientNonce
/** HTTP header name for the session `bridgeEpoch` the owner binds proofs to. */
export const OWNER_BRIDGE_EPOCH_HEADER = BRIDGE_HEADERS.ownerBridgeEpoch
/** HTTP header name for the one-time request nonce issued by the challenge registry. */
export const OWNER_REQUEST_NONCE_HEADER = BRIDGE_HEADERS.ownerRequestNonce
/** HTTP header name for the SHA-256 hex of the owner request body. */
export const OWNER_BODY_SHA256_HEADER = BRIDGE_HEADERS.ownerBodySha256
/** HTTP header name for the owner HMAC request proof. */
export const OWNER_PROOF_HEADER = BRIDGE_HEADERS.ownerProof

/** Credential and protocol fingerprint the owner uses to sign and verify HMAC proofs. */
export interface BridgeOwnerIdentity {
  readonly credential: string
  readonly protocolFingerprint: string
}

// ---------------------------------------------------------------------------
// Connector headers and identity
// ---------------------------------------------------------------------------

/** HTTP header name for the connector id on authenticated connector requests. */
export const CONNECTOR_ID_HEADER = auth.headers.id
/** HTTP header name for the Chrome extension id that owns the connector. */
export const CONNECTOR_EXTENSION_ID_HEADER = auth.headers.extensionId
/** HTTP header name for the connector handshake client nonce. */
export const CONNECTOR_CLIENT_NONCE_HEADER = auth.headers.clientNonce
/** HTTP header name for the session `bridgeEpoch` the connector binds proofs to. */
export const CONNECTOR_BRIDGE_EPOCH_HEADER = auth.headers.bridgeEpoch
/** HTTP header name for the one-time request nonce issued to the connector. */
export const CONNECTOR_REQUEST_NONCE_HEADER = auth.headers.requestNonce
/** HTTP header name for the SHA-256 hex of the connector request body. */
export const CONNECTOR_BODY_SHA256_HEADER = auth.headers.bodySha256
/** HTTP header name for the connector HMAC request proof. */
export const CONNECTOR_PROOF_HEADER = auth.headers.proof

/** Connector identity fields that enter HMAC proof messages; the shared secret is omitted. */
export interface ConnectorProofIdentity {
  readonly connectorId: string
  readonly extensionId: string
  readonly extensionDisplayVersion: string
  readonly protocolFingerprint: string
}

// ---------------------------------------------------------------------------
// HMAC primitives
// ---------------------------------------------------------------------------

/**
 * Whether a string is a 64-char lowercase hex SHA-256 token.
 * @param value - candidate hex string.
 * @returns true when `value` matches `/^[a-f0-9]{64}$/`.
 */
export const isHex256 = (value: string): boolean => /^[a-f0-9]{64}$/.test(value)

/**
 * HMAC-SHA256 hex proof over `message` using a hex-encoded credential.
 * @param credential - HMAC key as lowercase hex (`HMAC_AUTHENTICATION.keyEncoding`).
 * @param message - canonical proof message interpreted as UTF-8.
 * @returns 64-character lowercase hex digest.
 */
export const nodeHmacProof = (credential: string, message: string): string =>
  createHmac(HMAC_AUTHENTICATION.digest, Buffer.from(credential, 'hex'))
    .update(message)
    .digest('hex')

const proofMatches = (actual: string, expected: string): boolean =>
  isHex256(actual) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))

/**
 * Fresh 32-byte authentication token encoded as 64-character lowercase hex.
 * @returns a cryptographically random hex token for epochs and nonces.
 */
export const freshAuthenticationToken = (): string => randomBytes(32).toString('hex')

/**
 * SHA-256 hex of a UTF-8 request body, used as the HMAC body-hash field.
 * @param body - raw request body text.
 * @returns 64-character lowercase hex digest.
 */
export const hashBridgeRequestBody = (body: string): string =>
  createHash('sha256').update(body, 'utf8').digest('hex')

// ---------------------------------------------------------------------------
// Proof message construction (canonical JSON arrays)
// ---------------------------------------------------------------------------

/** One-time `bridgeEpoch` plus `requestNonce` the verifier issued for a single HMAC proof. */
export type BridgeRequestChallenge = {
  readonly bridgeEpoch: string
  readonly requestNonce: string
}

/** HMAC domain key in `HMAC_AUTHENTICATION.domains` (owner vs connector, server vs request). */
export type HmacAuthenticationDomain = keyof typeof HMAC_AUTHENTICATION.domains

const canonical = (parts: ReadonlyArray<string>): string => JSON.stringify(parts)

/**
 * Canonical JSON-array message the server signs during handshake.
 * @param domain - HMAC domain whose string prefix is included.
 * @param identity - identity fields inserted after the algorithm version; empty for owner proofs.
 * @param clientNonce - client-chosen nonce from the handshake headers.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param serverProtocolFingerprint - server's protocol fingerprint hex.
 * @returns deterministic JSON array string both sides HMAC.
 */
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

/**
 * Canonical JSON-array message the client signs for an authenticated request.
 * @param domain - HMAC domain whose string prefix is included.
 * @param identity - identity fields inserted after the algorithm version; empty for owner proofs.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param clientProtocolFingerprint - client's protocol fingerprint hex.
 * @param method - HTTP method bound into the proof.
 * @param path - request path bound into the proof.
 * @param bodyHash - SHA-256 hex of the request body.
 * @returns deterministic JSON array string both sides HMAC.
 */
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

/**
 * Owner handshake HMAC proof the bridge returns for a client nonce and challenge.
 * @param identity - owner credential and protocol fingerprint.
 * @param clientNonce - client-chosen nonce from the handshake.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @returns 64-character lowercase hex HMAC.
 */
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

/**
 * Timing-safe check that `proof` matches {@link ownerServerProof} for the same inputs.
 * @param identity - owner credential and protocol fingerprint.
 * @param clientNonce - client-chosen nonce from the handshake.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param proof - candidate hex HMAC from the peer.
 * @returns true when `proof` is well-formed hex and equals the expected owner server proof.
 */
export const hasValidOwnerServerProof = (
  identity: BridgeOwnerIdentity,
  clientNonce: string,
  challenge: BridgeRequestChallenge,
  proof: string,
): boolean => proofMatches(proof, ownerServerProof(identity, clientNonce, challenge))

/** Request fields bound into an owner request HMAC: challenge, method, path, and body hash. */
export type OwnerRequestProofInput = BridgeRequestChallenge & {
  readonly method: string
  readonly path: string
  readonly bodyHash: string
}

/**
 * Owner request HMAC proof for one HTTP method, path, and body hash.
 * @param identity - owner credential and protocol fingerprint.
 * @param input - challenge plus the request fields bound into the proof.
 * @returns 64-character lowercase hex HMAC.
 */
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

/**
 * Timing-safe check that `proof` matches {@link ownerRequestProof} for the same inputs.
 * @param identity - owner credential and protocol fingerprint.
 * @param input - challenge plus the request fields bound into the proof.
 * @param proof - candidate hex HMAC from the peer.
 * @returns true when `proof` is well-formed hex and equals the expected owner request proof.
 */
export const hasValidOwnerRequestProof = (
  identity: BridgeOwnerIdentity,
  input: OwnerRequestProofInput,
  proof: string,
): boolean => proofMatches(proof, ownerRequestProof(identity, input))

// ---------------------------------------------------------------------------
// Connector proofs
// ---------------------------------------------------------------------------

/**
 * Canonical handshake message for a connector server proof.
 * @param domain - must be `connectorServerProof`.
 * @param identity - connector fields included in the HMAC message.
 * @param clientNonce - client-chosen nonce from the handshake.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param serverProtocolFingerprint - server's protocol fingerprint hex.
 * @returns deterministic JSON array string both sides HMAC.
 */
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

/**
 * Canonical request message for a connector request proof.
 * @param domain - must be `connectorRequestProof`.
 * @param identity - connector fields included in the HMAC message.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param method - HTTP method bound into the proof.
 * @param path - request path bound into the proof.
 * @param bodyHash - SHA-256 hex of the request body.
 * @returns deterministic JSON array string both sides HMAC.
 */
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

/**
 * Connector handshake HMAC. The key is empty when `protocolFingerprint` is empty, otherwise the connector secret.
 * @param identity - connector fields included in the message.
 * @param clientNonce - client-chosen nonce from the handshake.
 * @param challenge - issued `bridgeEpoch` and `requestNonce`.
 * @param serverProtocolFingerprint - server's protocol fingerprint hex.
 * @returns 64-character lowercase hex HMAC.
 */
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

/** Discriminator for which challenge registry an authentication session consults. */
export type BridgeChallengeScope = 'owner' | 'connector'

const BRIDGE_CHALLENGE_SCOPES = ['owner', 'connector'] as const satisfies ReadonlyArray<BridgeChallengeScope>

/** Header-derived challenge plus body hash and HMAC proof presented for admission. */
export type BridgeRequestProofHeaders = BridgeRequestChallenge & {
  readonly bodyHash: string
  readonly proof: string
}

/** Outcome of consuming a challenge: accepted headers, malformed inputs, or an unknown/expired nonce. */
export type BridgeChallengeAdmission =
  | { readonly _tag: 'Accepted'; readonly authentication: BridgeRequestProofHeaders }
  | { readonly _tag: 'Malformed' }
  | { readonly _tag: 'Unavailable' }

/** In-memory one-time nonce registry with a count cap and millisecond TTL. */
export class BridgeChallengeRegistry {
  private readonly pending = new Map<string, number>()

  constructor(
    private readonly limit: number,
    private readonly ttlMs: number,
    private readonly generateToken: () => string = freshAuthenticationToken,
  ) {}

  /**
   * Issue a new request nonce, evicting expired and oldest entries when at the cap.
   * @param now - current time in milliseconds since the Unix epoch.
   * @returns a unique 64-character hex nonce reserved until `now + ttlMs`.
   */
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

  /**
   * Consume a reserved nonce if it is still pending.
   * @param requestNonce - nonce previously returned by {@link BridgeChallengeRegistry.issue}.
   * @param now - current time in milliseconds since the Unix epoch.
   * @returns true when the nonce was pending and is now spent; false when unknown or expired.
   */
  consume(requestNonce: string, now: number): boolean {
    this.prune(now)
    if (!this.pending.has(requestNonce)) return false
    this.pending.delete(requestNonce)
    return true
  }

  /**
   * Drop expired nonces and report how many remain.
   * @param now - current time in milliseconds since the Unix epoch.
   * @returns pending nonce count after pruning.
   */
  pruneAndCount(now: number): number {
    this.prune(now)
    return this.pending.size
  }

  /** Forget every pending nonce. */
  clear(): void {
    this.pending.clear()
  }

  private prune(now: number): void {
    for (const [requestNonce, expiresAt] of this.pending) {
      if (expiresAt <= now) this.pending.delete(requestNonce)
    }
  }
}

/** Per-process owner/connector challenge issuer that binds proofs to one `bridgeEpoch`. */
export class BridgeAuthenticationSession {
  /** Session epoch hex bound into every challenge this instance issues. */
  readonly bridgeEpoch = freshAuthenticationToken()
  private readonly challenges = Object.fromEntries(
    BRIDGE_CHALLENGE_SCOPES.map(scope => [
      scope,
      new BridgeChallengeRegistry(PENDING_CHALLENGE_LIMIT, 5_000),
    ]),
  ) as Record<BridgeChallengeScope, BridgeChallengeRegistry>

  /**
   * Issue a challenge for one scope.
   * @param scope - owner or connector registry to draw from.
   * @param now - current time in milliseconds since the Unix epoch.
   * @returns this session's `bridgeEpoch` plus a fresh `requestNonce`.
   */
  issue(scope: BridgeChallengeScope, now: number): BridgeRequestChallenge {
    return {
      bridgeEpoch: this.bridgeEpoch,
      requestNonce: this.challenges[scope].issue(now),
    }
  }

  /**
   * Admit presented headers against a previously issued nonce. Does not verify
   * the HMAC; callers must check the proof after `Accepted`.
   * @param scope - owner or connector registry that issued the nonce.
   * @param authentication - presented epoch, nonce, body hash, and proof.
   * @param now - current time in milliseconds since the Unix epoch.
   * @returns `Accepted` with the headers, `Malformed` for ill-formed hex or a
   *   stale epoch, or `Unavailable` when the nonce is unknown or spent.
   */
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

  /**
   * Spend a nonce without admitting a request, so it cannot be reused.
   * @param scope - owner or connector registry that issued the nonce.
   * @param requestNonce - nonce to invalidate.
   * @param now - current time in milliseconds since the Unix epoch.
   */
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

/** Fixed sample HMAC messages mixed into the protocol fingerprint so proof layout changes bump the hash. */
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
