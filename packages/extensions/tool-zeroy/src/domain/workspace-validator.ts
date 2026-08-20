import Ajv2020Module from 'ajv/dist/2020.js'
type ErrorObject = import('ajv').ErrorObject
const Ajv2020 = (Ajv2020Module as unknown as { default?: typeof Ajv2020Module }).default ?? Ajv2020Module
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/** One authored JSON file that missed its projected Connector schema. */
export type WorkspaceValidationFailure = {
  readonly path: string
  readonly contract: string
  readonly issues: readonly string[]
}

/** Workspace evaluation: schema failures plus paths whose projected contract file is missing. */
export type WorkspaceValidation = {
  readonly failures: readonly WorkspaceValidationFailure[]
  readonly stalePaths: readonly string[]
}

/** Thrown while parsing authored JSON or compiling a projected schema; callers usually surface it as a failure issue. */
export class WorkspaceValidationError extends Error {
  /** Closed-union discriminant for this validation failure. */
  readonly code = 'WorkspaceValidationError' as const
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'WorkspaceValidationError'
    this.cause = cause
  }
}

const contractPath = (relative: string): string | null => {
  if (relative === 'site.json') return '.zeroy/contracts/site.schema.json'
  if (relative === 'artifacts/theme/zeroy.schema.json')
    return '.zeroy/contracts/theme-schema.schema.json'
  if (relative === 'artifacts/theme/zeroy.theme.json')
    return '.zeroy/contracts/theme-manifest.schema.json'
  if (relative === 'artifacts/theme/zcss.design.json')
    return '.zeroy/contracts/zcss-design.schema.json'
  if (relative === 'artifacts/site-logic/sitelogic.json')
    return '.zeroy/contracts/site-logic.schema.json'
  if (relative === 'content/site-copy.json')
    return '.zeroy/contracts/content/site-copy.schema.json'
  const post = /^content\/posts\/([^/]+)\/[^/]+\.json$/u.exec(relative)
  if (post) return `.zeroy/contracts/content/posts/${post[1]}.schema.json`
  const term = /^content\/terms\/([^/]+)\/[^/]+\.json$/u.exec(relative)
  if (term) return `.zeroy/contracts/content/terms/${term[1]}.schema.json`
  const localePost = /^locales\/([^/]+)\/posts\/([^/]+)\/[^/]+\.json$/u.exec(relative)
  if (localePost)
    return `.zeroy/contracts/locales/${localePost[1]}/posts/${localePost[2]}.schema.json`
  const localeTerm = /^locales\/([^/]+)\/terms\/([^/]+)\/[^/]+\.json$/u.exec(relative)
  if (localeTerm)
    return `.zeroy/contracts/locales/${localeTerm[1]}/terms/${localeTerm[2]}.schema.json`
  const localeCopy = /^locales\/([^/]+)\/site-copy\.json$/u.exec(relative)
  if (localeCopy) return `.zeroy/contracts/locales/${localeCopy[1]}/site-copy.schema.json`
  return null
}

const issueText = (error: ErrorObject): string =>
  `${error.instancePath || '/'}: ${error.message ?? error.keyword}`

const parseJson = (encoded: string): unknown => {
  try {
    return JSON.parse(encoded) as unknown
  } catch (cause) {
    throw new WorkspaceValidationError('invalid JSON', cause)
  }
}

const compileAndValidate = (
  ajv: InstanceType<typeof Ajv2020>,
  schema: object,
  value: unknown,
): string[] => {
  try {
    const validate = ajv.compile(schema)
    return validate(value) ? [] : (validate.errors ?? []).slice(0, 20).map(issueText)
  } catch (cause) {
    throw new WorkspaceValidationError('projected contract is invalid', cause)
  }
}

/**
 * This is deliberately a generic closed-schema evaluator. Document meaning is
 * owned by the Connector-generated contracts, never reimplemented here.
 * @param root - checkout root containing authored files and `.zeroy/contracts`.
 * @param authoredPaths - relative paths to consider; only `.json` files with a mapped contract are evaluated.
 * @returns schema failures and paths whose projected contract file is missing.
 */
export async function validateWorkspaceDocuments(
  root: string,
  authoredPaths: readonly string[],
): Promise<WorkspaceValidation> {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false })
  const failures: WorkspaceValidationFailure[] = []
  const stalePaths: string[] = []

  for (const relative of authoredPaths.filter(entry => entry.endsWith('.json'))) {
    const projected = contractPath(relative)
    if (projected === null) continue

    const schemaFile = path.join(root, ...projected.split('/'))

    // Check if schema file exists
    let schemaExists: boolean
    try {
      await readFile(schemaFile)
      schemaExists = true
    } catch {
      schemaExists = false
    }

    if (!schemaExists) {
      stalePaths.push(relative)
      continue
    }

    // Read both files in parallel
    let encoded: string
    let schemaEncoded: string
    try {
      [encoded, schemaEncoded] = await Promise.all([
        readFile(path.join(root, ...relative.split('/')), 'utf-8'),
        readFile(schemaFile, 'utf-8'),
      ])
    } catch (cause) {
      failures.push({
        path: relative,
        contract: projected,
        issues: [`/: Could not read files: ${String(cause)}`],
      })
      continue
    }

    // Parse JSON
    let document: unknown
    let schema: unknown
    try {
      document = parseJson(encoded)
      schema = parseJson(schemaEncoded)
    } catch (cause) {
      failures.push({
        path: relative,
        contract: projected,
        issues: [`/: ${cause instanceof WorkspaceValidationError ? cause.message : String(cause)}`],
      })
      continue
    }

    // Validate against schema
    try {
      const issues = compileAndValidate(ajv, schema as object, document)
      if (issues.length > 0) {
        failures.push({
          path: relative,
          contract: projected,
          issues,
        })
      }
    } catch (cause) {
      failures.push({
        path: relative,
        contract: projected,
        issues: [`/: ${cause instanceof WorkspaceValidationError ? cause.message : String(cause)}`],
      })
    }
  }

  return { failures, stalePaths }
}
