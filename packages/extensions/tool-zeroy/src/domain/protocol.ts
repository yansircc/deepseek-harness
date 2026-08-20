import { Type, type Static, type TSchema } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const SiteId = Type.String({ minLength: 1, description: 'Configured zeroY site identifier.' })
const ObjectHash = Type.String({ pattern: '^sha256:[a-f0-9]{64}$' })

const JsonValue = Type.Recursive(Self =>
  Type.Union([
    Type.String(),
    Type.Number(),
    Type.Boolean(),
    Type.Null(),
    Type.Array(Self),
    Type.Record(Type.String(), Self),
  ]),
)

/** TypeBox schema for `zeroy_inspect` input, discriminated on `resource`. */
export const InspectInputContract = Type.Union([
  Type.Object({ resource: Type.Literal('sites') }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('refs'),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('commit'),
    commitView: Type.Optional(
      Type.Union([Type.Literal('summary'), Type.Literal('history'), Type.Literal('diff')], {
        description: 'Optional when resource = commit; defaults to summary.',
      }),
    ),
    commit: Type.Optional(ObjectHash),
    base: Type.Optional(ObjectHash),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('releaseHistory'),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({ siteId: SiteId, resource: Type.Literal('site') }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('current'),
    draftRef: Type.Optional(Type.String({ pattern: '^refs/drafts/' })),
    buildId: Type.Optional(ObjectHash),
  }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('review'),
    reviewView: Type.Optional(
      Type.Union([Type.Literal('summary'), Type.Literal('actions')], {
        description:
          'Optional when resource = review; defaults to summary. actions returns complete derived gaps in bounded pages; Agent never closes them manually.',
      }),
    ),
    commit: Type.Optional(ObjectHash),
    draftRef: Type.Optional(Type.String({ pattern: '^refs/drafts/' })),
    buildId: Type.Optional(ObjectHash),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('proof'),
    proofId: Type.String({ minLength: 1 }),
    proofView: Type.Optional(
      Type.Union(
        [Type.Literal('summary'), Type.Literal('repairGroups'), Type.Literal('failureInstances')],
        {
          description:
            'Optional when resource = proof; defaults to summary. Use repairGroups for normal repair work. failureInstances is low-level paginated verifier evidence and may repeat one defect across scenarios and viewports.',
        },
      ),
    ),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({ siteId: SiteId, resource: Type.Literal('integrity') }),
  Type.Object({
    siteId: SiteId,
    resource: Type.Literal('externalCheck'),
    externalCheckView: Type.Optional(
      Type.Union([Type.Literal('summary'), Type.Literal('pages'), Type.Literal('failures')], {
        description: 'Optional when resource = externalCheck; defaults to summary.',
      }),
    ),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
    cursor: Type.Optional(Type.String({ minLength: 1 })),
    urls: Type.Optional(
      Type.Array(Type.String({ minLength: 1, maxLength: 2048 }), {
        maxItems: 20,
        description: 'Optional same-origin URLs in addition to active-release scenarios.',
      }),
    ),
  }),
])
/** Decoded `zeroy_inspect` command after domain validation. */
export type InspectInput = Static<typeof InspectInputContract>

/** TypeBox schema for `zeroy_checkout` input, discriminated on `source`. */
export const CheckoutInputContract = Type.Union([
  Type.Object(
    { siteId: SiteId, source: Type.Literal('active-release') },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      siteId: SiteId,
      source: Type.Literal('draft-ref'),
      draftRef: Type.String({ pattern: '^refs/drafts/' }),
    },
    { additionalProperties: false },
  ),
])
/** Decoded `zeroy_checkout` command after domain validation. */
export type CheckoutInput = Static<typeof CheckoutInputContract>

/** TypeBox schema for `zeroy_push` input. Unknown fields fail at decode. */
export const PushInputContract = Type.Object(
  {
    siteId: SiteId,
    checkoutId: Type.String({ minLength: 1 }),
    message: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
)
/** Decoded `zeroy_push` command after exact-field validation. */
export type PushInput = Static<typeof PushInputContract>

const BrowserViewportContract = Type.Object({
  id: Type.Union([Type.Literal('mobile'), Type.Literal('tablet'), Type.Literal('desktop')]),
  width: Type.Integer({ minimum: 1 }),
  height: Type.Integer({ minimum: 1 }),
})
const BrowserContrastPairContract = Type.Object({
  id: Type.String({ minLength: 1 }),
  foreground: Type.String({ pattern: '^--z-' }),
  background: Type.String({ pattern: '^--z-' }),
  minimum: Type.Number({ minimum: 1 }),
})
/** TypeBox schema for a Connector-issued `zeroy/browser-verification-challenge@4`. */
export const BrowserVerificationChallengeContract = Type.Object({
  contract: Type.Literal('zeroy/browser-verification-challenge@4'),
  verifier: Type.Object({
    id: Type.Literal('zeroy/pi-browser-verifier@4'),
    version: Type.Literal('1'),
  }),
  releaseId: Type.String({ minLength: 1 }),
  themeArtifactId: Type.String({ minLength: 1 }),
  scenarioSetHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  stylesheetSetHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  stylesheets: Type.Array(
    Type.Object({
      path: Type.String({ minLength: 1 }),
      hash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
      url: Type.String({ minLength: 1 }),
    }),
    { minItems: 1 },
  ),
  viewports: Type.Array(BrowserViewportContract, { minItems: 3, maxItems: 3 }),
  contrastPairs: Type.Array(BrowserContrastPairContract, { minItems: 1 }),
  scenarios: Type.Array(
    Type.Object({
      id: Type.String({ minLength: 1 }),
      kind: Type.String({ minLength: 1 }),
      locale: Type.String({ minLength: 1 }),
      url: Type.String({ minLength: 1 }),
      expectedStatus: Type.Integer({ minimum: 100, maximum: 599 }),
      expectedRouteKind: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
      requiredFields: Type.Array(Type.String({ pattern: '^/acf/' })),
    }),
    { minItems: 1 },
  ),
  challengeHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
})
/** Challenge the local Chromium verifier must execute before Proof. */
export type BrowserVerificationChallenge = Static<typeof BrowserVerificationChallengeContract>

const BrowserResultContract = Type.Object(
  {
    scenario: Type.String({ minLength: 1 }),
    viewport: Type.String({ minLength: 1 }),
    status: Type.Integer({ minimum: 100, maximum: 599 }),
    routeKind: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    stylesheetIdentity: Type.String(),
    stylesheets: Type.Array(Type.String()),
    documentClientWidth: Type.Integer({ minimum: 1 }),
    documentScrollWidth: Type.Integer({ minimum: 1 }),
    overflowElements: Type.Integer({ minimum: 0 }),
    overflowSamples: Type.Array(Type.String({ minLength: 1 }), { maxItems: 5 }),
    mediaOverflowElements: Type.Integer({ minimum: 0 }),
    mediaOverflowSamples: Type.Array(Type.String({ minLength: 1 }), { maxItems: 5 }),
    focusVisible: Type.Union([Type.Boolean(), Type.Null()]),
    reducedMotion: Type.Boolean(),
    contrastRatios: Type.Record(Type.String({ minLength: 1 }), Type.Number({ minimum: 0 })),
    visibleTextContrastFailures: Type.Integer({ minimum: 0 }),
    visibleTextContrastSamples: Type.Array(Type.String({ minLength: 1 }), { maxItems: 5 }),
    visibleTextContrastIndeterminate: Type.Integer({ minimum: 0 }),
    visibleTextContrastIndeterminateSamples: Type.Array(Type.String({ minLength: 1 }), {
      maxItems: 5,
    }),
    renderedFields: Type.Array(Type.String({ pattern: '^/acf/' })),
  },
  { additionalProperties: false },
)
/** TypeBox schema for verifier-produced `zeroy/browser-evidence@4`. */
export const BrowserEvidenceContract = Type.Object({
  contract: Type.Literal('zeroy/browser-evidence@4'),
  challengeHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  releaseId: Type.String({ minLength: 1 }),
  themeArtifactId: Type.String({ minLength: 1 }),
  scenarioSetHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  stylesheetSetHash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
  verifier: Type.Object({
    id: Type.Literal('zeroy/pi-browser-verifier@4'),
    version: Type.Literal('1'),
    engine: Type.String({ minLength: 1 }),
    engineVersion: Type.String({ minLength: 1 }),
  }),
  results: Type.Array(BrowserResultContract, { minItems: 1 }),
})
/** Measurements collected by the local Chromium verifier for one challenge. */
export type BrowserEvidence = Static<typeof BrowserEvidenceContract>

/** TypeBox schema for a `zeroy/site-release@3` receipt, including an optional browser challenge. */
export const SiteReleaseReceiptContract = Type.Object({
  contract: Type.Literal('zeroy/site-release@3'),
  releaseId: Type.String({ minLength: 1 }),
  commit: Type.Union([ObjectHash, Type.Null()]),
  buildId: Type.Union([ObjectHash, Type.Null()]),
  previousReleaseId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  themeArtifactId: Type.String({ minLength: 1 }),
  siteLogicArtifactId: Type.String({ minLength: 1 }),
  themeContractHash: Type.String({ minLength: 64, maxLength: 64 }),
  zcss: Type.Union([JsonValue, Type.Null()]),
  siteLogicContractHash: Type.String({ minLength: 64, maxLength: 64 }),
  storageEpoch: Type.Integer({ minimum: 0 }),
  snapshotHash: Type.String({ minLength: 64, maxLength: 64 }),
  expectedActiveReleaseId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  reviewBriefHash: Type.Union([Type.String({ minLength: 64, maxLength: 64 }), Type.Null()]),
  state: Type.Union([
    Type.Literal('preview-awaiting-browser'),
    Type.Literal('preview'),
    Type.Literal('proof-ready'),
    Type.Literal('active'),
    Type.Literal('superseded'),
    Type.Literal('discarded'),
  ]),
  proofId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  activeReleaseId: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  provenance: Type.Union([JsonValue, Type.Null()]),
  diagnostics: Type.Object({
    contract: Type.Literal('zeroy/site-release-diagnostics@1'),
    migration: Type.Union([JsonValue, Type.Null()]),
    proof: Type.Union([JsonValue, Type.Null()]),
  }),
  browserVerification: Type.Union([BrowserVerificationChallengeContract, Type.Null()]),
  createdAt: Type.String({ minLength: 1 }),
  activatedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  previewUrl: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
})

type JsonSchema = TSchema & {
  readonly $defs?: Readonly<Record<string, JsonSchema>>
  readonly $ref?: string
  readonly anyOf?: ReadonlyArray<JsonSchema>
  readonly const?: unknown
  readonly properties?: Readonly<Record<string, JsonSchema>>
  readonly required?: ReadonlyArray<string>
}

type Variant = {
  readonly value: string
  readonly properties: Readonly<Record<string, JsonSchema>>
  readonly required: ReadonlySet<string>
}

/** Failure when a provider-facing tool schema cannot be projected from a domain schema. */
export class ProviderSchemaProjectionError extends Error {
  /** Closed-union discriminant for this projection failure. */
  readonly code = 'ProviderSchemaProjectionError' as const
  constructor(message: string) {
    super(message)
    this.name = 'ProviderSchemaProjectionError'
  }
}

/** Failure when tool JSON does not satisfy the selected domain variant. */
export class ToolInputValidationError extends Error {
  /** Closed-union discriminant for this decode failure. */
  readonly code = 'ToolInputValidationError' as const
  constructor(message: string) {
    super(message)
    this.name = 'ToolInputValidationError'
  }
}

/** Tagged success or failure; callers must match `_tag` instead of catching. */
export type ProtocolResult<Success, Failure> =
  | { readonly _tag: 'Success'; readonly value: Success }
  | { readonly _tag: 'Failure'; readonly error: Failure }

const success = <Success>(value: Success): ProtocolResult<Success, never> => ({
  _tag: 'Success',
  value,
})
const failure = <Failure>(error: Failure): ProtocolResult<never, Failure> => ({
  _tag: 'Failure',
  error,
})

const resolveLocalSchemaReference = (root: JsonSchema, reference: string): unknown => {
  if (!reference.startsWith('#/')) return undefined
  let cursor: unknown = root
  for (const encoded of reference.slice(2).split('/')) {
    const segment = encoded.replaceAll('~1', '/').replaceAll('~0', '~')
    if (typeof cursor !== 'object' || cursor === null || !(segment in cursor)) return undefined
    cursor = (cursor as Readonly<Record<string, unknown>>)[segment]
  }
  return cursor
}

/**
 * Accept a provider tool-parameter schema only when it is a top-level object,
 * contains no `additionalProperties`, and every `$ref` resolves under `#/$defs/`.
 * @param schema - candidate JSON Schema document from a provider projection.
 * @returns Success with the schema as `TSchema`, or Failure with the first projection error.
 */
export const validateProviderSchemaDocument = (
  schema: unknown,
): ProtocolResult<TSchema, ProviderSchemaProjectionError> => {
  if (typeof schema !== 'object' || schema === null || (schema as JsonSchema).type !== 'object') {
    return failure(
      new ProviderSchemaProjectionError('Provider tool parameters must have top-level type "object".'),
    )
  }
  const root = schema as JsonSchema
  const visit = (value: unknown): ProviderSchemaProjectionError | undefined => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const error = visit(item)
        if (error) return error
      }
      return undefined
    }
    if (typeof value !== 'object' || value === null) return undefined
    const node = value as JsonSchema
    if ('additionalProperties' in node) {
      return new ProviderSchemaProjectionError(
        'Provider schema must not contain additionalProperties; exact field closure belongs to the domain decoder.',
      )
    }
    if (node.$ref !== undefined) {
      if (
        !node.$ref.startsWith('#/$defs/') ||
        resolveLocalSchemaReference(root, node.$ref) === undefined
      ) {
        return new ProviderSchemaProjectionError(
          `Provider schema reference is not locally resolvable: ${node.$ref}.`,
        )
      }
    }
    for (const nested of Object.values(node)) {
      const error = visit(nested)
      if (error) return error
    }
    return undefined
  }
  const error = visit(root)
  return error ? failure(error) : success(root)
}

const variantsOf = (
  contract: JsonSchema,
  discriminator: string,
): ReadonlyArray<Variant> | ProviderSchemaProjectionError => {
  if (!Array.isArray(contract.anyOf) || contract.anyOf.length === 0) {
    return new ProviderSchemaProjectionError(
      'Provider-safe projection requires a non-empty discriminated union.',
    )
  }
  const seen = new Set<string>()
  const variants: Variant[] = []
  for (const schema of contract.anyOf) {
    const properties = schema.properties
    const value = properties?.[discriminator]?.const
    if (!properties || typeof value !== 'string' || seen.has(value)) {
      return new ProviderSchemaProjectionError(
        `Every union member must define one unique literal ${discriminator}.`,
      )
    }
    seen.add(value)
    variants.push({ value, properties, required: new Set(schema.required ?? []) })
  }
  return variants
}

const plainSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(plainSchema)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'description')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, plainSchema(nested)]),
  )
}

/**
 * Tool parameters are a model hint, never the command authority. Some OpenAI-compatible
 * providers reject `additionalProperties` outright, while the domain contracts need it
 * to reject unknown command fields. Project the broadest interoperable schema here and
 * keep exactness exclusively in decodeDiscriminated/decodeExact.
 */
const providerDialectSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(providerDialectSchema)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'additionalProperties')
      .map(([key, nested]) => [key, providerDialectSchema(nested)]),
  )
}

const providerSchemaDocument = (schema: TSchema): TSchema =>
  providerDialectSchema(schema) as TSchema

const providerSafeParameters = (
  contract: TSchema,
  discriminator: string,
): ProtocolResult<TSchema, ProviderSchemaProjectionError> => {
  const variants = variantsOf(contract as JsonSchema, discriminator)
  if (variants instanceof ProviderSchemaProjectionError) return failure(variants)
  const fields = new Map<string, JsonSchema[]>()
  for (const variant of variants) {
    for (const [field, schema] of Object.entries(variant.properties)) {
      fields.set(field, [...(fields.get(field) ?? []), schema])
    }
  }
  const properties: Record<string, TSchema> = {}
  for (const [field, definitions] of fields) {
    if (field === discriminator) {
      properties[field] = Type.String({
        enum: variants.map(({ value }) => value),
        description: `One of: ${variants.map(({ value }) => value).join(', ')}.`,
      })
      continue
    }
    const baseline = JSON.stringify(plainSchema(definitions[0]))
    if (definitions.some(definition => JSON.stringify(plainSchema(definition)) !== baseline)) {
      return failure(
        new ProviderSchemaProjectionError(
          `Conflicting definitions for field ${field} in ${discriminator} union.`,
        ),
      )
    }
    const requiredBy = variants
      .filter(variant => variant.required.has(field))
      .map(variant => variant.value)
    const description =
      requiredBy.length > 0 && requiredBy.length < variants.length
        ? `Required when ${discriminator} = ${requiredBy.join(' or ')}.`
        : definitions[0]?.description
    properties[field] = { ...definitions[0], ...(description ? { description } : {}) } as TSchema
  }
  const universal = new Set(
    [...fields.keys()].filter(field => variants.every(variant => variant.required.has(field))),
  )
  return validateProviderSchemaDocument(
    providerSchemaDocument(
      Type.Object(
        Object.fromEntries(
          Object.entries(properties).map(([field, schema]) => [
            field,
            universal.has(field) ? schema : Type.Optional(schema),
          ]),
        ),
        { additionalProperties: false },
      ),
    ),
  )
}

const providerSafeObject = (
  contract: TSchema,
): ProtocolResult<TSchema, ProviderSchemaProjectionError> => {
  const schema = contract as JsonSchema
  if (!schema.properties) {
    return failure(
      new ProviderSchemaProjectionError('Provider-safe projection requires an object.'),
    )
  }
  return validateProviderSchemaDocument(providerSchemaDocument(contract))
}

const decodeDiscriminated = <Output>(
  contract: TSchema,
  discriminator: string,
  input: unknown,
): ProtocolResult<Output, ToolInputValidationError | ProviderSchemaProjectionError> => {
  const variants = variantsOf(contract as JsonSchema, discriminator)
  if (variants instanceof ProviderSchemaProjectionError) return failure(variants)
  const record =
    typeof input === 'object' && input !== null ? (input as Readonly<Record<string, unknown>>) : {}
  const selected = variants.find(variant => variant.value === record[discriminator])
  if (!selected) {
    return failure(
      new ToolInputValidationError(
        `${discriminator} must be one of [${variants.map(({ value }) => value).join(', ')}].`,
      ),
    )
  }
  const exact = Type.Object(selected.properties as Record<string, TSchema>, {
    additionalProperties: false,
  })
  if (Value.Check(exact, input)) return success(input as Output)
  const issues = [...Value.Errors(exact, input)]
    .slice(0, 8)
    .map(issue => `${issue.path || 'input'}: ${issue.message}`)
    .join('; ')
  return failure(
    new ToolInputValidationError(`Invalid ${discriminator} ${selected.value} input: ${issues}`),
  )
}

const decodeExact = <Output>(
  contract: TSchema,
  label: string,
  input: unknown,
): ProtocolResult<Output, ToolInputValidationError> => {
  if (Value.Check(contract, input)) return success(input as Output)
  const issues = [...Value.Errors(contract, input)]
    .slice(0, 8)
    .map(issue => `${issue.path || 'input'}: ${issue.message}`)
    .join('; ')
  return failure(new ToolInputValidationError(`Invalid ${label} input: ${issues}`))
}

/** Provider-safe inspect parameters: flattened `resource` union without `additionalProperties`. */
export const InspectProviderProjection = providerSafeParameters(InspectInputContract, 'resource')
/** Provider-safe checkout parameters: flattened `source` union without `additionalProperties`. */
export const CheckoutProviderProjection = providerSafeParameters(CheckoutInputContract, 'source')
/** Provider-safe push parameters: object schema with `additionalProperties` stripped. */
export const PushProviderProjection = providerSafeObject(PushInputContract)

/**
 * Decode inspect JSON against the `resource` union and apply commit/review field rules.
 * Review rejects `commit` and `draftRef` together; commit summary requires `commit`;
 * commit diff requires `commit` and `base`.
 * @param input - untrusted tool-call JSON.
 * @returns Success with `InspectInput`, or Failure for projection or validation errors.
 */
export const decodeInspectInput = (
  input: unknown,
): ProtocolResult<InspectInput, ToolInputValidationError | ProviderSchemaProjectionError> => {
  const decoded = decodeDiscriminated<InspectInput>(InspectInputContract, 'resource', input)
  if (decoded._tag === 'Failure') return decoded
  if (
    decoded.value.resource === 'review' &&
    decoded.value.commit !== undefined &&
    decoded.value.draftRef !== undefined
  ) {
    return failure(
      new ToolInputValidationError('review accepts either commit or draftRef, not both.'),
    )
  }
  if (decoded.value.resource !== 'commit') return decoded
  const view = decoded.value.commitView ?? 'summary'
  if (view === 'summary' && decoded.value.commit === undefined) {
    return failure(new ToolInputValidationError('commit summary requires commit.'))
  }
  if (view === 'diff' && (decoded.value.commit === undefined || decoded.value.base === undefined)) {
    return failure(
      new ToolInputValidationError('commit diff requires commit and base.'),
    )
  }
  return decoded
}

/**
 * Decode checkout JSON against the `source` union. Unknown fields on the selected variant fail.
 * @param input - untrusted tool-call JSON.
 * @returns Success with `CheckoutInput`, or Failure for projection or validation errors.
 */
export const decodeCheckoutInput = (
  input: unknown,
): ProtocolResult<CheckoutInput, ToolInputValidationError | ProviderSchemaProjectionError> =>
  decodeDiscriminated<CheckoutInput>(CheckoutInputContract, 'source', input)

/**
 * Decode push JSON against the exact object schema. Unknown fields fail.
 * @param input - untrusted tool-call JSON.
 * @returns Success with `PushInput`, or Failure when fields do not match.
 */
export const decodePushInput = (
  input: unknown,
): ProtocolResult<PushInput, ToolInputValidationError> =>
  decodeExact<PushInput>(PushInputContract, 'push', input)

/** Model-visible checkout guidance: inspect first, edit authored files only, push repair slices; administrators own publish. */
export const CHECKOUT_PROMPT_GUIDELINES =
  'Inspect current state and refs, checkout one active release or DraftRef, then begin at .zeroy/README.md. Edit only normal authored files in that checkout; .zeroy is a derived, read-only Brief and Review projection. Push each coherent repair slice. Every renderable push becomes an administrator-only PreviewRelease; the extension owns object hashes, CAS, rebase, retries, BuildResult, browser evidence, and Proof. Only an administrator may publish a proof-ready PreviewRelease to the public site.'

/** JSON object record used for Connector payloads and diagnostic bags. */
export type JsonRecord = Readonly<Record<string, unknown>>
