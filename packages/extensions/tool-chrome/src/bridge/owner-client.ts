/**
 * Owner-side client: authenticates to the bridge and forwards commands.
 *
 * @module @deepseek-ai/dsh-tool-chrome/bridge/owner-client
 */

import {
  BridgeUnavailable,
  BridgeOwnerUnreachable,
  CommandOutcomeUnknown,
} from './errors.ts'
import type {
  BridgeAuthenticationHandshake,
  BridgeStatusResponse,
  ForwardRequest,
  ForwardResponse,
  SessionContext,
  WireDomainRequest,
} from '../protocol/schema.ts'
import {
  OWNER_BODY_SHA256_HEADER,
  OWNER_BRIDGE_EPOCH_HEADER,
  OWNER_CLIENT_NONCE_HEADER,
  OWNER_PROOF_HEADER,
  OWNER_PROTOCOL_FINGERPRINT_HEADER,
  OWNER_REQUEST_NONCE_HEADER,
  freshAuthenticationToken,
  hashBridgeRequestBody,
  hasValidOwnerServerProof,
  ownerRequestProof,
  type BridgeOwnerIdentity,
  type BridgeRequestChallenge,
} from '../protocol/auth.ts'
import {
  OWNER_COMMAND_HTTP_RESPONSE_GRACE_MS,
  OWNER_REQUEST_DEADLINE_MS,
  responseBodyLimitForRoute,
  type OwnerBridgeRouteName,
} from '../protocol/bridge-contract.ts'
import { decodeBridgeStatusJson } from './codec.ts'

/** Bounded HTTP result from an owner-route fetch: status, ok flag, and raw body text. */
export interface OwnerResponse {
  readonly ok: boolean
  readonly status: number
  readonly text: string
}

const readBodyBounded = async (response: Response, limitBytes: number): Promise<string> => {
  if (!Number.isSafeInteger(limitBytes) || limitBytes < 0) {
    throw new BridgeUnavailable('Shared bridge owner response limit is invalid')
  }
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > limitBytes) {
    throw new BridgeUnavailable(
      `Shared bridge owner response exceeds ${limitBytes} bytes`,
    )
  }
  const text = await response.text()
  if (Buffer.byteLength(text, 'utf8') > limitBytes) {
    throw new BridgeUnavailable(
      `Shared bridge owner response exceeds ${limitBytes} bytes`,
    )
  }
  return text
}

/**
 * Fetch one owner-facing bridge route without attaching HMAC request proof.
 * Used for the handshake; other routes go through authenticated owner requests.
 * @param baseUrl - bridge origin, with no trailing path.
 * @param routeName - owner route whose method and path are selected from the route table.
 * @param init - fetch init excluding `method`, which the route owns.
 * @param timeoutMs - abort deadline; defaults to `OWNER_REQUEST_DEADLINE_MS`.
 * @returns the HTTP status and bounded body text.
 * @throws BridgeOwnerUnreachable when fetch fails; BridgeUnavailable when the body exceeds the route limit.
 */
export const ownerRequest = async (
  baseUrl: string,
  routeName: OwnerBridgeRouteName,
  init: Omit<RequestInit, 'method'>,
  timeoutMs: number = OWNER_REQUEST_DEADLINE_MS,
): Promise<OwnerResponse> => {
  const route = {
    ownerHandshake: { method: 'GET', path: '/owner/handshake' },
    status: { method: 'GET', path: '/status' },
    statusWait: { method: 'GET', path: '/status/wait' },
    command: { method: 'POST', path: '/command' },
  }[routeName]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${route.path}`, {
        ...init,
        method: route.method,
        signal: controller.signal,
      })
    } catch (cause) {
      throw new BridgeOwnerUnreachable(
        'Shared bridge owner is unreachable',
        cause,
      )
    }
    const text = await readBodyBounded(response, responseBodyLimitForRoute(routeName))
    return { ok: response.ok, status: response.status, text }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Require an HTTP-success owner response and return its body.
 * @param response - result from `ownerRequest` or an authenticated owner fetch.
 * @returns the response text when `ok` is true.
 * @throws BridgeUnavailable when the status is not 2xx, including the status and body in the message.
 */
export const requireOwnerSuccess = async (response: OwnerResponse): Promise<string> => {
  if (response.ok) return response.text
  throw new BridgeUnavailable(
    `Shared bridge owner returned HTTP ${response.status}: ${response.text}`,
  )
}

const ownerChallenge = async (
  url: string,
  identity: BridgeOwnerIdentity,
): Promise<BridgeRequestChallenge> => {
  const clientNonce = freshAuthenticationToken()
  const response = await ownerRequest(url, 'ownerHandshake', {
    headers: {
      [OWNER_CLIENT_NONCE_HEADER]: clientNonce,
      [OWNER_PROTOCOL_FINGERPRINT_HEADER]: identity.protocolFingerprint,
    },
  })
  const text = await requireOwnerSuccess(response)
  const handshake = JSON.parse(text) as BridgeAuthenticationHandshake
  if (handshake.protocolFingerprint !== identity.protocolFingerprint) {
    throw new BridgeUnavailable(
      `Bridge owner protocol fingerprint ${handshake.protocolFingerprint} does not match ${identity.protocolFingerprint}`,
    )
  }
  const challenge = {
    bridgeEpoch: handshake.bridgeEpoch,
    requestNonce: handshake.requestNonce,
  } satisfies BridgeRequestChallenge
  if (!hasValidOwnerServerProof(identity, clientNonce, challenge, handshake.proof)) {
    throw new BridgeUnavailable('Shared bridge listener did not prove owner credential possession')
  }
  return challenge
}

const authenticatedOwnerRequest = async (
  url: string,
  routeName: Exclude<OwnerBridgeRouteName, 'ownerHandshake'>,
  identity: BridgeOwnerIdentity,
  init: { headers?: Record<string, string>; body?: string } = {},
  timeoutMs?: number,
): Promise<OwnerResponse> => {
  const challenge = await ownerChallenge(url, identity)
  const route = {
    status: { method: 'GET', path: '/status' },
    statusWait: { method: 'GET', path: '/status/wait' },
    command: { method: 'POST', path: '/command' },
  }[routeName]
  const body = init.body ?? ''
  const bodyHash = hashBridgeRequestBody(body)
  const proof = ownerRequestProof(identity, {
    ...challenge,
    method: route.method,
    path: route.path,
    bodyHash,
  })
  return ownerRequest(
    url,
    routeName,
    {
      ...init,
      headers: {
        ...init.headers,
        [OWNER_PROTOCOL_FINGERPRINT_HEADER]: identity.protocolFingerprint,
        [OWNER_BRIDGE_EPOCH_HEADER]: challenge.bridgeEpoch,
        [OWNER_REQUEST_NONCE_HEADER]: challenge.requestNonce,
        [OWNER_BODY_SHA256_HEADER]: bodyHash,
        [OWNER_PROOF_HEADER]: proof,
      },
    },
    timeoutMs,
  )
}

/**
 * Prove the owner credential against a live bridge via the handshake challenge.
 * @param url - bridge origin.
 * @param identity - owner credential and protocol fingerprint the listener must match.
 * @throws BridgeUnavailable when the fingerprint or server proof does not match;
 *   BridgeOwnerUnreachable when the listener cannot be reached.
 */
export const handshakeWithOwner = async (
  url: string,
  identity: BridgeOwnerIdentity,
): Promise<void> => {
  await ownerChallenge(url, identity)
}

/**
 * Read current bridge status as the authenticated owner.
 * @param url - bridge origin.
 * @param identity - owner credential used to complete the challenge and sign the GET.
 * @returns the decoded status payload.
 * @throws BridgeUnavailable on non-2xx or failed proof; BridgeOwnerUnreachable when the listener cannot be reached.
 */
export const statusFromOwner = async (
  url: string,
  identity: BridgeOwnerIdentity,
): Promise<BridgeStatusResponse> => {
  const response = await authenticatedOwnerRequest(url, 'status', identity)
  const text = await requireOwnerSuccess(response)
  return decodeBridgeStatusJson(text)
}

/**
 * Fetch owner status via the wait route with a caller-chosen abort deadline.
 * @param url - bridge origin.
 * @param identity - owner credential used to complete the challenge and sign the GET.
 * @param timeoutMs - abort deadline for this request.
 * @returns the decoded status payload.
 * @throws BridgeUnavailable on non-2xx or failed proof; BridgeOwnerUnreachable when the listener cannot be reached.
 */
export const waitForStatusFromOwner = async (
  url: string,
  identity: BridgeOwnerIdentity,
  timeoutMs: number,
): Promise<BridgeStatusResponse> => {
  const response = await authenticatedOwnerRequest(url, 'statusWait', identity, {}, timeoutMs)
  const text = await requireOwnerSuccess(response)
  return decodeBridgeStatusJson(text)
}

/**
 * Forward one command to the bridge as the owner and await its result.
 * @param url - bridge origin.
 * @param identity - owner credential used to complete the challenge and sign the POST.
 * @param request - domain request forwarded in the command envelope.
 * @param session - session context attached to the envelope.
 * @param timeoutMs - command deadline; the HTTP abort is this plus `OWNER_COMMAND_HTTP_RESPONSE_GRACE_MS`.
 * @returns the command result value on `ok`.
 * @throws BridgeFailure on rejection/timeout/unreachable.
 */
export const forwardCommandToOwner = async (
  url: string,
  identity: BridgeOwnerIdentity,
  request: WireDomainRequest,
  session: SessionContext,
  timeoutMs: number,
): Promise<unknown> => {
  const envelope: ForwardRequest = { ...request, session, timeoutMs }
  const response = await authenticatedOwnerRequest(
    url,
    'command',
    identity,
    {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(envelope),
    },
    timeoutMs + OWNER_COMMAND_HTTP_RESPONSE_GRACE_MS,
  )
  let parsed: ForwardResponse
  try {
    parsed = JSON.parse(response.text) as ForwardResponse
  } catch (cause) {
    throw new CommandOutcomeUnknown(
      'Bridge owner response did not establish a command outcome',
      cause,
    )
  }
  if (parsed.ok) return parsed.value
  const error = parsed.error
  switch (error._tag) {
    case 'CommandRejected':
      throw new BridgeUnavailable(
        `Chrome command rejected: ${error.code}: ${error.message}`,
      )
    case 'CommandOutcomeUnknown':
      throw new BridgeUnavailable(`Chrome command outcome unknown: ${error.message}`)
    case 'CommandTimeout':
      throw new BridgeUnavailable(`Chrome command timed out: ${error.message}`)
    case 'ConnectorNotBound':
    case 'ConnectorOffline':
    case 'BridgeStopped':
    case 'BridgeUnavailable':
    case 'ProtocolFailure':
    default:
      throw new BridgeUnavailable(error.message)
  }
}
