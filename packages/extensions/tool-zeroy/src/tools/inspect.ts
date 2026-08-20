/**
 * `zeroy_inspect` tool: read typed zeroY Connector resources.
 *
 * @module @deepseek-ai/dsh-tool-zeroy/tools/inspect
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  InspectProviderProjection,
  decodeInspectInput,
  CHECKOUT_PROMPT_GUIDELINES,
} from '../domain/protocol.ts'
import { resolveConnection } from '../session.ts'
import type { SiteConnection } from '../domain/connection.ts'
import { connectorGet } from '../domain/client.ts'
import type { ExternalCheckView } from '../domain/checker.ts'

/** Tool description for the model. */
const INSPECT_DESCRIPTION =
  'Read one typed zeroY Connector resource, including external browser checks. '
  + CHECKOUT_PROMPT_GUIDELINES

/**
 * Register the `zeroy_inspect` tool on the given context.
 * @param ctx - plugin context that owns the tool registry; no-ops when schema projection failed.
 */
export function registerInspectTool(ctx: Context): void {
  if (InspectProviderProjection._tag === 'Failure') {
    ctx.logger.warn('tool-zeroy: zeroy_inspect disabled — schema projection failed: %s',
      InspectProviderProjection.error.message)
    return
  }

  // DSH-native parameter schema. Full validation happens inside execute via decodeInspectInput.
  const parameters = {
    resource: { type: 'string' as const, required: true as const, description: 'One of: sites, refs, commit, releaseHistory, site, current, review, proof, integrity, externalCheck.' },
    siteId: { type: 'string' as const, description: 'Required when resource != sites.' },
    commitView: { type: 'string' as const, description: 'Optional when resource = commit; defaults to summary.' },
    commit: { type: 'string' as const, description: 'Commit hash (sha256:...).' },
    base: { type: 'string' as const, description: 'Base commit hash for diff view.' },
    reviewView: { type: 'string' as const, description: 'Optional when resource = review; defaults to summary.' },
    proofId: { type: 'string' as const, description: 'Required when resource = proof.' },
    proofView: { type: 'string' as const, description: 'Optional when resource = proof; defaults to summary.' },
    draftRef: { type: 'string' as const, description: 'Draft ref (refs/drafts/...).' },
    buildId: { type: 'string' as const, description: 'Build result hash.' },
    limit: { type: 'integer' as const, description: 'Page size (1-50).' },
    cursor: { type: 'string' as const, description: 'Pagination cursor.' },
    urls: { type: 'array' as const, description: 'Optional same-origin URLs for externalCheck.', items: { type: 'string' as const } },
    externalCheckView: { type: 'string' as const, description: 'Optional when resource = externalCheck; defaults to summary.' },
  }

  ctx.tools.register(defineTool({
    name: 'zeroy_inspect',
    description: INSPECT_DESCRIPTION,
    parameters,
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => true,
    async execute(args: unknown, exec: { signal?: AbortSignal }) {
      const decoded = decodeInspectInput(args)
      if (decoded._tag === 'Failure') {
        throw new Error(decoded.error.message)
      }

      const input = decoded.value

      // `sites` does not require a connection
      if (input.resource === 'sites') {
        const { getConfiguredSites } = await import('../settings.ts')
        const { loadSiteConnections } = await import('../domain/connection.ts')
        const settingsSites = getConfiguredSites()
        const envSites = await loadSiteConnections()
        const allSites = [...settingsSites, ...envSites]
        return {
          contract: 'zeroy/configured-sites@1',
          sites: allSites.map(({ siteId, label, endpoint }) => ({ siteId, label, endpoint })),
        }
      }

      const connection = await resolveConnection(ctx, input.siteId)
      const signal = exec.signal

      // Route to the appropriate Connector endpoint
      const result = await inspectResource(connection, input, signal)
      return result.payload
    },
  } as never))
}

// ---------------------------------------------------------------------------
// Resource routing (ported from Pi inspect-tools.ts)
// ---------------------------------------------------------------------------

type JsonRecord = Readonly<Record<string, unknown>>

async function inspectResource(
  connection: { siteId: string; label: string; endpoint: string; grantSecret: string },
  input: { resource: string; [key: string]: unknown },
  signal: AbortSignal | undefined,
): Promise<{ payload: JsonRecord; summary: string }> {
  const site = connection as unknown as SiteConnection

  switch (input.resource) {
    case 'refs': {
      const params = new URLSearchParams({ limit: String((input.limit as number) ?? 20) })
      if (input.cursor !== undefined) params.set('cursor', String(input.cursor))
      return {
        payload: await connectorGet(site, `site-refs?${params.toString()}`, signal),
        summary: 'Read DraftRefs',
      }
    }
    case 'commit': {
      const view = (input.commitView as string) ?? 'summary'
      if (view === 'summary') {
        return {
          payload: await connectorGet(site, `site-commits/${input.commit ?? ''}`, signal),
          summary: 'Read immutable SiteCommit',
        }
      }
      const params = new URLSearchParams({ limit: String((input.limit as number) ?? 20) })
      if (input.cursor !== undefined) params.set('cursor', String(input.cursor))
      if (input.commit !== undefined) params.set('commit', String(input.commit))
      if (view === 'diff' && input.base !== undefined) params.set('base', String(input.base))
      return {
        payload: await connectorGet(
          site,
          `${view === 'diff' ? 'site-commit-diff' : 'site-commits'}?${params.toString()}`,
          signal,
        ),
        summary: view === 'diff' ? 'Read bounded SiteCommit diff' : 'Read SiteCommit history',
      }
    }
    case 'releaseHistory': {
      const params = new URLSearchParams({ limit: String((input.limit as number) ?? 20) })
      if (input.cursor !== undefined) params.set('cursor', String(input.cursor))
      return {
        payload: await connectorGet(site, `site-releases?${params.toString()}`, signal),
        summary: 'Read SiteRelease history',
      }
    }
    case 'site':
      return {
        payload: await connectorGet(site, 'site', signal),
        summary: 'Read site handshake',
      }
    case 'current': {
      const params = new URLSearchParams()
      if (input.draftRef !== undefined) params.set('draftRef', String(input.draftRef))
      if (input.buildId !== undefined) params.set('buildId', String(input.buildId))
      return {
        payload: await connectorGet(site, `site-review/current?${params.toString()}`, signal),
        summary: 'Read administrator Brief, latest Commit, Preview, ActiveRelease, and bounded Review',
      }
    }
    case 'review': {
      const view = (input.reviewView as string) ?? 'summary'
      const params = new URLSearchParams({ view, limit: String((input.limit as number) ?? 20) })
      if (input.commit !== undefined) params.set('commit', String(input.commit))
      if (input.draftRef !== undefined) params.set('draftRef', String(input.draftRef))
      if (input.buildId !== undefined) params.set('buildId', String(input.buildId))
      if (input.cursor !== undefined) params.set('cursor', String(input.cursor))
      return {
        payload: await connectorGet(site, `site-review?${params.toString()}`, signal),
        summary: view === 'actions'
          ? 'Read bounded derived Review actions'
          : 'Read current bounded Review summary',
      }
    }
    case 'proof': {
      const view = (input.proofView as string) ?? 'summary'
      const params = new URLSearchParams({ view, limit: String((input.limit as number) ?? 20) })
      if (input.cursor !== undefined) params.set('cursor', String(input.cursor))
      return {
        payload: await connectorGet(
          site,
          `site-release-proofs/${input.proofId}?${params.toString()}`,
          signal,
        ),
        summary: `Read CandidateProof ${view}`,
      }
    }
    case 'integrity':
      return {
        payload: await connectorGet(site, 'integrity', signal),
        summary: 'Ran Connector integrity checks',
      }
    case 'externalCheck': {
      // External check requires the checker module; delegate to it
      const { runExternalCheck, externalCheckProjection, sameOriginExternalCheckUrls } =
        await import('../domain/checker.ts')
      const releaseTargetsPayload = await connectorGet(
        site, 'site-release/external-check-targets', signal,
      )
      const urls = sameOriginExternalCheckUrls(
        site.endpoint,
        (input.urls as string[] | undefined) ?? [],
      )
      if ('code' in urls) {
        throw new Error(urls.message)
      }
      const check = await runExternalCheck(releaseTargetsPayload as unknown as Parameters<typeof runExternalCheck>[0], urls, signal)
      return {
        payload: externalCheckProjection(
          check,
          (input.externalCheckView as ExternalCheckView | undefined) ?? 'summary',
          (input.limit as number) ?? 10,
          input.cursor as string | undefined,
        ),
        summary: 'Ran external checks',
      }
    }
    default:
      throw new Error(`Unknown inspect resource: ${input.resource}`)
  }
}
