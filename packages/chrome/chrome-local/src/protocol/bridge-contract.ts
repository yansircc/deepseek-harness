/**
 * Bridge transport contract: routes, limits, deadlines, and authentication
 * constants for the DSH Chrome local bridge. Pure data projection of
 * `bridge.json` — no runtime dependencies.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/bridge-contract
 */

import bridge from './bridge.json' with { type: 'json' }

/** Loopback hostname the local bridge listens on. */
export const BRIDGE_HOST = bridge.host
/** TCP port the local bridge listens on. */
export const BRIDGE_PORT = bridge.port
/** Origin string (`http://host:port`) used by owner and connector clients. */
export const BRIDGE_ORIGIN = `http://${BRIDGE_HOST}:${BRIDGE_PORT}`
/** Header names the bridge protocol requires on authenticated requests. */
export const BRIDGE_HEADERS = bridge.headers
/** HMAC authentication parameters projected from `bridge.json`. */
export const HMAC_AUTHENTICATION = bridge.hmacAuthentication

type RawRoute = {
  readonly method: string
  readonly path: string
  readonly bodyLimit: string
  readonly responseLimit: string
}

type TransportLimitName = keyof typeof bridge.transportLimitsBytes
type AuthorizedRoute<Authorization extends keyof typeof bridge.routes> = {
  readonly method: string
  readonly path: string
  readonly bodyLimit: TransportLimitName
  readonly responseLimit: TransportLimitName
  readonly authorization: Authorization
}

const authorizeRoutes = <
  Authorization extends keyof typeof bridge.routes,
  Routes extends Readonly<Record<string, RawRoute>>,
>(
  authorization: Authorization,
  routes: Routes,
) =>
  Object.fromEntries(
    Object.entries(routes).map(([name, route]) => [name, { ...route, authorization }]),
  ) as {
    readonly [Name in keyof Routes]: AuthorizedRoute<Authorization>
  }

const ownerRoutes = authorizeRoutes('owner', bridge.routes.owner)
const extensionRoutes = authorizeRoutes('extension', bridge.routes.extension)
const connectorRoutes = authorizeRoutes('connector', bridge.routes.connector)

type OwnerAuthorizedRouteName = keyof typeof bridge.routes.owner
type ConnectorAuthorizedRouteName = keyof typeof bridge.routes.connector

const mergeRouteGroups = <
  Owner extends Readonly<Record<string, AuthorizedRoute<'owner'>>>,
  Extension extends Readonly<Record<string, AuthorizedRoute<'extension'>>>,
  Connector extends Readonly<Record<string, AuthorizedRoute<'connector'>>>,
>(
  owner: Owner,
  extension: Extension & {
    readonly [Name in Extract<keyof Extension, keyof Owner>]: never
  },
  connector: Connector & {
    readonly [Name in Extract<keyof Connector, keyof Owner | keyof Extension>]: never
  },
): Owner & Extension & Connector => ({ ...owner, ...extension, ...connector })

/** All owner, extension, and connector routes keyed by protocol name. */
export const BRIDGE_ROUTES = mergeRouteGroups(ownerRoutes, extensionRoutes, connectorRoutes)

/** Owner HTTP request deadline, in milliseconds. */
export const OWNER_REQUEST_DEADLINE_MS = bridge.transportDeadlinesMs.ownerRequest
/** Extra time the owner waits after the HTTP response before treating the command as lost. */
export const OWNER_COMMAND_HTTP_RESPONSE_GRACE_MS =
  bridge.transportDeadlinesMs.ownerCommandHttpResponseGrace
/** Connector HTTP request deadline, in milliseconds. */
export const CONNECTOR_REQUEST_DEADLINE_MS = bridge.transportDeadlinesMs.connectorRequest
/** Long-poll wait deadline for the next command, in milliseconds. */
export const POLL_WAIT_DEADLINE_MS = bridge.transportDeadlinesMs.pollWait
/** Connector lease lifetime, in milliseconds, before the bind is dropped. */
export const CONNECTOR_LEASE_DEADLINE_MS = bridge.transportDeadlinesMs.connectorLease
/** Incoming request body read deadline, in milliseconds. */
export const INCOMING_REQUEST_DEADLINE_MS = bridge.transportDeadlinesMs.incomingRequest
/** Incoming header read deadline, in milliseconds. */
export const INCOMING_HEADERS_DEADLINE_MS = bridge.transportDeadlinesMs.incomingHeaders
/** Authentication challenge lifetime, in milliseconds. */
export const AUTHENTICATION_CHALLENGE_DEADLINE_MS =
  bridge.transportDeadlinesMs.authenticationChallenge
/** Authentication handshake deadline, in milliseconds. */
export const AUTHENTICATION_HANDSHAKE_DEADLINE_MS =
  bridge.transportDeadlinesMs.authenticationHandshake
/** Maximum accepted screenshot payload size, in bytes. */
export const SCREENSHOT_PAYLOAD_BYTE_LIMIT = bridge.transportLimitsBytes.screenshotPayload
/** Screenshot capture limits projected from `bridge.json`. */
export const SCREENSHOT_LIMITS = bridge.screenshotLimits
/** Maximum number of screenshot tiles one capture may return. */
export const SCREENSHOT_MAX_TILE_COUNT = SCREENSHOT_LIMITS.maxTiles
/** Default request-body size limit, in bytes. */
export const REQUEST_BODY_BYTE_LIMIT = bridge.transportLimitsBytes.requestBody
/** Maximum concurrent incoming HTTP connections. */
export const INCOMING_CONNECTION_LIMIT = bridge.transportLimitsCount.incomingConnections
/** Maximum outstanding authentication challenges per scope. */
export const PENDING_CHALLENGE_LIMIT = bridge.transportLimitsCount.pendingChallengesPerScope
/** Maximum commands admitted for one connector before the mailbox rejects more. */
export const MAX_ADMITTED_COMMANDS_PER_CONNECTOR =
  bridge.mailboxLimits.maxAdmittedCommandsPerConnector
/** Limits on how many tabs/windows a command may target. */
export const AUTOMATION_TARGET_LIMITS = bridge.automationTargetLimits
/** HTTP status the bridge returns when the request body exceeds its limit. */
export const REQUEST_BODY_TOO_LARGE_STATUS = bridge.httpStatuses.requestBodyTooLarge
/** Per-command deadlines, in milliseconds, keyed by command name. */
export const COMMAND_DEADLINES_MS = bridge.commandDeadlinesMs

/** Protocol name of any route in {@link BRIDGE_ROUTES}. */
export type BridgeRouteName = keyof typeof BRIDGE_ROUTES
/** Protocol name of an owner-authorized route. */
export type OwnerBridgeRouteName = OwnerAuthorizedRouteName
/** Connector route that requires a completed handshake, excluding the handshake itself. */
export type ConnectorAuthenticatedRouteName = Exclude<
  ConnectorAuthorizedRouteName,
  'connectorHandshake'
>

/**
 * Request-body byte limit for one named route.
 * @param name - route name in {@link BRIDGE_ROUTES}.
 * @returns the limit from `bridge.json` transportLimitsBytes.
 */
export const requestBodyLimitForRoute = (name: BridgeRouteName): number =>
  bridge.transportLimitsBytes[BRIDGE_ROUTES[name].bodyLimit]

/**
 * Response-body byte limit for one named route.
 * @param name - route name in {@link BRIDGE_ROUTES}.
 * @returns the limit from `bridge.json` transportLimitsBytes.
 */
export const responseBodyLimitForRoute = (name: BridgeRouteName): number =>
  bridge.transportLimitsBytes[BRIDGE_ROUTES[name].responseLimit]

/**
 * Whether the route is owner-authorized.
 * @param name - route name in {@link BRIDGE_ROUTES}.
 * @returns true when the route's authorization is `owner`.
 */
export const isOwnerBridgeRouteName = (name: BridgeRouteName): name is OwnerBridgeRouteName =>
  BRIDGE_ROUTES[name].authorization === 'owner'

/**
 * Whether method and path match one named route.
 * @param name - route name to test.
 * @param method - HTTP method, or undefined when the request has none.
 * @param path - request path.
 * @returns true when method matches and the path is exact or the route is `*`.
 */
export const matchesBridgeRoute = (
  name: BridgeRouteName,
  method: string | undefined,
  path: string,
): boolean => {
  const route = BRIDGE_ROUTES[name]
  return method === route.method && (route.path === '*' || path === route.path)
}

/** Result of matching an HTTP method and path against {@link BRIDGE_ROUTES}. */
export type BridgeRouteResolution =
  | { readonly _tag: 'Matched'; readonly name: BridgeRouteName }
  | { readonly _tag: 'NotFound' }
  | {
    readonly _tag: 'Ambiguous'
    readonly names: readonly [
      BridgeRouteName,
      BridgeRouteName,
      ...ReadonlyArray<BridgeRouteName>,
    ]
  }

/**
 * Resolve the unique route for an HTTP method and path.
 * @param method - HTTP method, or undefined when the request has none.
 * @param path - request path.
 * @returns a match, not-found, or ambiguous result when several routes collide.
 */
export const resolveBridgeRoute = (
  method: string | undefined,
  path: string,
): BridgeRouteResolution => {
  const names = (Object.keys(BRIDGE_ROUTES) as ReadonlyArray<BridgeRouteName>).filter(name =>
    matchesBridgeRoute(name, method, path),
  )
  if (names.length === 0) return { _tag: 'NotFound' }
  if (names.length === 1) {
    const name = names[0]
    if (name === undefined) return { _tag: 'NotFound' }
    return { _tag: 'Matched', name }
  }
  return {
    _tag: 'Ambiguous',
    names: names as [BridgeRouteName, BridgeRouteName, ...Array<BridgeRouteName>],
  }
}

/** Comma-separated unique HTTP methods accepted by {@link BRIDGE_ROUTES}. */
export const BRIDGE_ALLOWED_METHODS = [
  ...new Set(Object.values(BRIDGE_ROUTES).map(({ method }) => method)),
].join(',')

type StatusRange = {
  readonly minimum: number
  readonly maximum: number
}

/** HTTP status policy that classifies a command result as terminal, retryable, or blocked. */
export type ResultDeliveryPolicy = {
  readonly acknowledgedStatus: number
  readonly unknownCommandStatus: number
  readonly retryableRange: StatusRange
}

/** How the owner should treat one command HTTP status. */
export type ResultDeliveryDecision = 'terminal' | 'retry' | 'blocked'

/** Default result-delivery policy projected from `bridge.json`. */
export const RESULT_DELIVERY_POLICY: ResultDeliveryPolicy = bridge.resultDelivery

const isWithin = (status: number, range: StatusRange): boolean =>
  status >= range.minimum && status <= range.maximum

/**
 * Classify a command HTTP status under the delivery policy.
 * @param status - HTTP status returned for the command.
 * @param policy - status policy; defaults to {@link RESULT_DELIVERY_POLICY}.
 * @returns `terminal` for ack/unknown, `retry` inside the retryable range, otherwise `blocked`.
 */
export const classifyResultDelivery = (
  status: number,
  policy: ResultDeliveryPolicy = RESULT_DELIVERY_POLICY,
): ResultDeliveryDecision => {
  if (status === policy.acknowledgedStatus || status === policy.unknownCommandStatus)
    return 'terminal'
  return isWithin(status, policy.retryableRange) ? 'retry' : 'blocked'
}
