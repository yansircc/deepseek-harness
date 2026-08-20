/**
 * External site checker — fetches pages from a zeroY site, validates HTTP
 * status codes, extracts basic SEO metadata, checks internal links for
 * breakage, and optionally runs a Google PageSpeed Insights audit.
 *
 * Ported from Effect-TS to plain async/await with native fetch().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JsonRecord = Readonly<Record<string, unknown>>

/** Fetch or HTML-read failure during an external page or PageSpeed request. */
export class ZeroYExternalCheckError extends Error {
  /** Closed-union discriminant for this fetch or read failure. */
  readonly code = 'ZeroYExternalCheckError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ZeroYExternalCheckError'
  }
}

/** One fetched page: HTTP, SEO tags, internal-link sample, or a captured fetch error. */
export type PageCheck = {
  readonly scenarioId: string
  readonly routeKind: string
  readonly objectId: number | null
  readonly locale: string | null
  readonly url: string
  readonly expectedStatus: number
  readonly finalUrl: string | null
  readonly status: number | null
  readonly title: string | null
  readonly description: string | null
  readonly h1: string | null
  readonly canonical: string | null
  readonly hreflang: ReadonlyArray<string>
  readonly checkedLinks: number
  readonly brokenLinks: ReadonlyArray<{ readonly url: string; readonly status: number | null }>
  readonly error: string | null
}

/** Page the checker should fetch: expected status and identity fields. */
export type ExternalCheckTarget = {
  readonly scenarioId: string
  readonly routeKind: string
  readonly objectId: number | null
  readonly locale: string | null
  readonly url: string
  readonly expectedStatus: number
}

/** Rejection when a requested URL is not absolute or not same-origin with the site. */
export type ExternalCheckUrlError = {
  readonly code: 'zeroy_external_check_url_invalid' | 'zeroy_external_check_url_origin_invalid'
  readonly message: string
}

/** Completed external check: per-page results plus optional PageSpeed score. */
export type ExternalCheck = {
  readonly checkedAt: number
  readonly pages: ReadonlyArray<PageCheck>
  readonly pageSpeed: {
    readonly state: 'not-configured' | 'ok' | 'failed'
    readonly score: number | null
    readonly message: string | null
  }
}

/** Projection page: summary counts, all pages, or failing pages only. */
export type ExternalCheckView = 'summary' | 'pages' | 'failures'

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Accept only absolute URLs whose origin matches the site endpoint. Stops at the first invalid URL.
 * @param endpoint - configured site origin; trailing path is ignored after `new URL`.
 * @param urls - caller-supplied URLs to admit.
 * @returns href list in input order, or the first URL error.
 */
export const sameOriginExternalCheckUrls = (
  endpoint: string,
  urls: ReadonlyArray<string>,
): ReadonlyArray<string> | ExternalCheckUrlError => {
  const origin = new URL(endpoint).origin
  const checked: string[] = []
  for (const raw of urls) {
    if (!URL.canParse(raw)) {
      return {
        code: 'zeroy_external_check_url_invalid',
        message: 'External checks require absolute same-origin URLs.',
      }
    }
    const url = new URL(raw)
    if (url.origin !== origin) {
      return {
        code: 'zeroy_external_check_url_origin_invalid',
        message: 'External checks may only load URLs from the configured zeroY site origin.',
      }
    }
    checked.push(url.href)
  }
  return checked
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

const record = (value: unknown): JsonRecord | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null

const attribute = (markup: string, name: string): string | null => {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(markup)
  return match?.[1] ?? null
}

const tag = (html: string, name: string): string | null => {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i').exec(html)
  if (!match) return null
  const content = (match[1] ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return content.length === 0 ? null : content
}

const meta = (html: string, name: string): string | null => {
  const candidates = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const candidate of candidates) {
    if (attribute(candidate, 'name')?.toLowerCase() === name.toLowerCase())
      return attribute(candidate, 'content')
  }
  return null
}

const links = (html: string, base: URL): ReadonlyArray<string> => {
  const values = new Set<string>()
  for (const anchor of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attribute(anchor, 'href')
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue
    if (URL.canParse(href, base.href)) {
      const url = new URL(href, base)
      if (url.origin === base.origin) values.add(url.href)
    }
    if (values.size >= 20) break
  }
  return [...values]
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const fetchResponse = async (
  url: string | URL,
  signal?: AbortSignal,
): Promise<Response> => {
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...(signal === undefined ? {} : { signal }),
    })
  } catch (cause) {
    throw new ZeroYExternalCheckError(
      `Could not fetch ${String(url)}: ${String(cause)}`,
    )
  }
}

const responseText = async (response: Response): Promise<string> => {
  try {
    return await response.text()
  } catch (cause) {
    throw new ZeroYExternalCheckError(`Could not read page HTML: ${String(cause)}`)
  }
}

const responseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch (cause) {
    throw new ZeroYExternalCheckError(`Could not read PageSpeed JSON: ${String(cause)}`)
  }
}

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

/** Run async tasks with bounded concurrency. */
async function forEachConcurrent<T, R>(
  items: ReadonlyArray<T>,
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      const item = items[index]
      if (item === undefined) continue
      results[index] = await fn(item)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Page checking
// ---------------------------------------------------------------------------

const failedPage = (page: ExternalCheckTarget, error: ZeroYExternalCheckError): PageCheck => ({
  scenarioId: page.scenarioId,
  routeKind: page.routeKind,
  objectId: page.objectId,
  locale: page.locale,
  url: page.url,
  expectedStatus: page.expectedStatus,
  finalUrl: null,
  status: null,
  title: null,
  description: null,
  h1: null,
  canonical: null,
  hreflang: [],
  checkedLinks: 0,
  brokenLinks: [],
  error: error.message,
})

const checkPage = async (
  page: ExternalCheckTarget,
  signal?: AbortSignal,
): Promise<PageCheck> => {
  try {
    const response = await fetchResponse(page.url, signal)
    const html = await responseText(response)

    if (!URL.canParse(response.url)) {
      throw new ZeroYExternalCheckError(
        `Response has invalid URL ${response.url}.`,
      )
    }

    const base = new URL(response.url)
    const checkedUrls = links(html, base)

    // Check each internal link with concurrency limit of 4
    const linkStatuses = await forEachConcurrent(
      checkedUrls,
      async (url) => {
        try {
          const target = await fetchResponse(url, signal)
          return target.ok ? null : { url, status: target.status }
        } catch {
          return { url, status: null }
        }
      },
      4,
    )

    const alternateTags = html.match(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi) ?? []

    return {
      scenarioId: page.scenarioId,
      routeKind: page.routeKind,
      objectId: page.objectId,
      locale: page.locale,
      url: page.url,
      expectedStatus: page.expectedStatus,
      finalUrl: response.url,
      status: response.status,
      title: tag(html, 'title'),
      description: meta(html, 'description'),
      h1: tag(html, 'h1'),
      canonical:
        (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) ?? [])
          .map(item => attribute(item, 'href'))
          .find(value => value !== null) ?? null,
      hreflang: alternateTags
        .map(item => attribute(item, 'hreflang'))
        .filter((value): value is string => value !== null),
      checkedLinks: linkStatuses.length,
      brokenLinks: linkStatuses.filter(
        (value): value is { readonly url: string; readonly status: number | null } =>
          value !== null,
      ),
      error: null,
    } satisfies PageCheck
  } catch (error) {
    return failedPage(
      page,
      error instanceof ZeroYExternalCheckError
        ? error
        : new ZeroYExternalCheckError(String(error)),
    )
  }
}

// ---------------------------------------------------------------------------
// PageSpeed
// ---------------------------------------------------------------------------

type PageSpeedCheck = ExternalCheck['pageSpeed']

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const pageSpeed = async (
  firstPage: string | undefined,
  signal?: AbortSignal,
): Promise<PageSpeedCheck> => {
  const apiKey = process.env.ZEROY_PAGESPEED_API_KEY

  if (firstPage === undefined || apiKey === undefined || apiKey.trim() === '') {
    return { state: 'not-configured', score: null, message: null } satisfies PageSpeedCheck
  }

  try {
    const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
    url.searchParams.set('url', firstPage)
    url.searchParams.set('strategy', 'mobile')
    url.searchParams.set('key', apiKey)

    const response = await fetchResponse(url, signal)
    const raw = await responseJson(response)

    const payload = record(raw)
    const lighthouse = payload ? record(payload.lighthouseResult) : null
    const categories = lighthouse ? record(lighthouse.categories) : null
    const performance = categories ? record(categories.performance) : null
    const score =
      typeof performance?.score === 'number' ? Math.round(performance.score * 100) : null

    return response.ok
      ? ({ state: 'ok', score, message: null } satisfies PageSpeedCheck)
      : ({
        state: 'failed',
        score: null,
        message: `PageSpeed returned ${response.status}.`,
      } satisfies PageSpeedCheck)
  } catch (error) {
    return {
      state: 'failed',
      score: null,
      message: errorMessage(error),
    } satisfies PageSpeedCheck
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch each unique target (release pages then requested URLs), sample internal links,
 * and optionally run PageSpeed when `ZEROY_PAGESPEED_API_KEY` is set. Page fetch
 * failures become `PageCheck.error`; they do not reject the promise.
 * @param releaseTargets - pages from the active-release scenarios.
 * @param requestedUrls - extra same-origin URLs treated as expected 200.
 * @param signal - optional abort for page and PageSpeed fetches.
 * @returns check timestamp, per-page results, and PageSpeed state.
 */
export const runExternalCheck = async (
  releaseTargets: ReadonlyArray<ExternalCheckTarget>,
  requestedUrls: ReadonlyArray<string> = [],
  signal?: AbortSignal,
): Promise<ExternalCheck> => {
  const pages = [
    ...releaseTargets,
    ...requestedUrls.map(url => ({
      scenarioId: `requested:${url}`,
      routeKind: 'requested',
      objectId: null,
      locale: null,
      url,
      expectedStatus: 200,
    })),
  ].filter(
    (page, index, all) => all.findIndex(candidate => candidate.url === page.url) === index,
  )

  const checkedAt = Date.now()

  // Run page checks and PageSpeed in parallel (concurrency: 2 in original)
  const [checkedPages, pageSpeedResult] = await Promise.all([
    forEachConcurrent(pages, page => checkPage(page, signal), 4),
    pageSpeed(pages[0]?.url, signal),
  ])

  return {
    checkedAt,
    pages: checkedPages,
    pageSpeed: pageSpeedResult,
  }
}

/**
 * One-line count of pages, HTTP mismatches or errors, and broken internal links.
 * @param check - completed external check.
 * @returns compact summary for inspect output.
 */
export const externalCheckSummary = (check: ExternalCheck): string => {
  const failures = check.pages.filter(
    page => page.status !== page.expectedStatus || page.error !== null,
  ).length
  const brokenLinks = check.pages.reduce((total, page) => total + page.brokenLinks.length, 0)
  return `${check.pages.length} page(s), ${failures} HTTP failure(s), ${brokenLinks} broken link(s)`
}

const pageFailed = (page: PageCheck): boolean =>
  page.status !== page.expectedStatus || page.error !== null || page.brokenLinks.length > 0

const externalCheckPageProjection = (page: PageCheck): JsonRecord => ({
  scenarioId: page.scenarioId,
  routeKind: page.routeKind,
  objectId: page.objectId,
  locale: page.locale,
  url: page.url,
  expectedStatus: page.expectedStatus,
  finalUrl: page.finalUrl,
  status: page.status,
  title: page.title,
  h1: page.h1,
  canonical: page.canonical,
  hreflang: page.hreflang,
  checkedLinks: page.checkedLinks,
  brokenLinkCount: page.brokenLinks.length,
  error: page.error,
})

/**
 * Project an external check for inspect. `summary` omits items; `pages` and `failures`
 * paginate with limit capped at 10.
 * @param check - completed external check.
 * @param view - which item list to include; defaults to `summary`.
 * @param limit - page size before the cap of 10.
 * @param cursor - decimal offset into the selected list; omitted starts at 0.
 * @returns summary envelope or a paged list with `nextCursor` and `hasMore`.
 */
export const externalCheckProjection = (
  check: ExternalCheck,
  view: ExternalCheckView = 'summary',
  limit = 10,
  cursor?: string,
): JsonRecord => {
  const failures = check.pages.filter(pageFailed)
  const brokenLinkCount = check.pages.reduce((total, page) => total + page.brokenLinks.length, 0)
  const routeKinds = [...new Set(check.pages.map(page => page.routeKind))].sort()
  const base = {
    checkedAt: check.checkedAt,
    pageCount: check.pages.length,
    failureCount: failures.length,
    brokenLinkCount,
    routeKinds,
    pageSpeed: check.pageSpeed,
  }
  if (view === 'summary') return { contract: 'zeroy/external-check-summary@1', ...base }
  const source = view === 'failures' ? failures : check.pages
  const offset = cursor === undefined ? 0 : Number.parseInt(cursor, 10)
  const boundedLimit = Math.min(10, Math.max(1, limit))
  const items = source.slice(offset, offset + boundedLimit).map(externalCheckPageProjection)
  const next = offset + items.length
  return {
    contract: `zeroy/external-check-${view}@1`,
    ...base,
    items,
    nextCursor: next < source.length ? String(next) : null,
    hasMore: next < source.length,
  }
}
