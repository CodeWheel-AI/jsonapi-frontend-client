import { FetchInit, FetchLike, getDrupalBaseUrlFromOptions, getFetch, mergeHeaders } from "./transport.js"
import { JsonApiDocument } from "./types.js"

/**
 * Build cache tags for a JSON:API entity URL (e.g. /jsonapi/node/page/{uuid}).
 *
 * These tags are compatible with the jsonapi_frontend revalidation webhook payload.
 */
export function buildEntityCacheTags(jsonapiPath: string): string[] {
  const tags: string[] = ["drupal"]

  // Parse: /jsonapi/{entity_type}/{bundle}/{uuid}
  const match = jsonapiPath.match(/\/jsonapi\/([^/]+)\/([^/]+)(?:\/([^/?]+))?/)
  if (!match) {
    return tags
  }

  const [, entityType, bundle, uuid] = match
  tags.push(`type:${entityType}--${bundle}`)
  tags.push(`bundle:${bundle}`)

  if (uuid) {
    tags.push(`${entityType}:${uuid}`)
    tags.push(`uuid:${uuid}`)
  }

  return tags
}

/**
 * Build cache tags for a jsonapi_views URL (e.g. /jsonapi/views/blog/page_1).
 */
export function buildViewCacheTags(dataUrl: string): string[] {
  const tags: string[] = ["drupal", "views"]

  const match = dataUrl.match(/\/jsonapi\/views\/([^/]+)\/([^/?]+)/)
  if (!match) {
    return tags
  }

  const [, viewId, displayId] = match
  tags.push(`view:${viewId}`)
  tags.push(`view:${viewId}--${displayId}`)

  return tags
}

function buildSafeUrl(input: string, base: string, options?: { allowExternalUrls?: boolean }): URL {
  const baseUrl = new URL(base)
  const url = new URL(input, baseUrl)

  if (!options?.allowExternalUrls && url.origin !== baseUrl.origin) {
    throw new Error(
      `Refusing to fetch a URL from a different origin (${url.origin}) than base (${baseUrl.origin}). ` +
        "Pass allowExternalUrls: true to override."
    )
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol "${url.protocol}" (expected http/https)`)
  }

  return url
}

function hasAuthLikeHeaders(headers: Headers): boolean {
  return headers.has("authorization") || headers.has("cookie")
}

export async function fetchJsonApi<T = JsonApiDocument>(
  jsonapiPath: string,
  options?: {
    baseUrl?: string
    envKey?: string
    /** Allow fetching absolute URLs on other origins (default: false). */
    allowExternalUrls?: boolean
    include?: string[]
    fields?: Record<string, string[]>
    revalidate?: number
    /** Additional cache tags to include (Next.js only). */
    tags?: string[]
    fetch?: FetchLike
    headers?: HeadersInit
    init?: FetchInit
  }
): Promise<T> {
  const base = getDrupalBaseUrlFromOptions({ baseUrl: options?.baseUrl, envKey: options?.envKey })
  const fetcher = getFetch(options?.fetch)

  const url = buildSafeUrl(jsonapiPath, base, { allowExternalUrls: options?.allowExternalUrls })

  if (options?.include?.length) {
    url.searchParams.set("include", options.include.join(","))
  }

  if (options?.fields) {
    for (const [type, fields] of Object.entries(options.fields)) {
      url.searchParams.set(`fields[${type}]`, fields.join(","))
    }
  }

  const tags = [...buildEntityCacheTags(jsonapiPath), ...(options?.tags ?? [])]

  const headers = mergeHeaders(options?.init?.headers, options?.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.api+json")
  }

  const hasExplicitCache = options?.init?.cache !== undefined
  const disableCaching = hasAuthLikeHeaders(headers) && !hasExplicitCache

  const init: FetchInit = {
    ...options?.init,
    headers,
  }

  if (disableCaching) {
    init.cache = "no-store"
    // Avoid mixing Next.js cache options with no-store.
    delete init.next
  }

  const fetchInit: FetchInit = disableCaching
    ? init
    : {
        ...init,
        next: {
          ...(options?.init?.next ?? {}),
          revalidate: options?.revalidate,
          tags: Array.from(new Set([...(options?.init?.next?.tags ?? []), ...tags])),
        },
      }

  const res = await fetcher(url.toString(), fetchInit)

  if (!res.ok) {
    throw new Error(`JSON:API fetch failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}

export async function fetchView<T = JsonApiDocument>(
  dataUrl: string,
  options?: {
    baseUrl?: string
    envKey?: string
    /** Allow fetching absolute URLs on other origins (default: false). */
    allowExternalUrls?: boolean
    /**
     * JSON:API pagination parameters.
     *
     * - number: sets page[offset]
     * - object: sets page[offset] and/or page[limit]
     */
    page?: number | { offset?: number; limit?: number }
    revalidate?: number
    /** Additional cache tags to include (Next.js only). */
    tags?: string[]
    fetch?: FetchLike
    headers?: HeadersInit
    init?: FetchInit
  }
): Promise<T> {
  const base = getDrupalBaseUrlFromOptions({ baseUrl: options?.baseUrl, envKey: options?.envKey })
  const fetcher = getFetch(options?.fetch)

  const url = buildSafeUrl(dataUrl, base, { allowExternalUrls: options?.allowExternalUrls })

  if (options?.page !== undefined) {
    if (typeof options.page === "number") {
      url.searchParams.set("page[offset]", String(options.page))
    } else {
      if (options.page.offset !== undefined) {
        url.searchParams.set("page[offset]", String(options.page.offset))
      }
      if (options.page.limit !== undefined) {
        url.searchParams.set("page[limit]", String(options.page.limit))
      }
    }
  }

  const tags = [...buildViewCacheTags(dataUrl), ...(options?.tags ?? [])]

  const headers = mergeHeaders(options?.init?.headers, options?.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.api+json")
  }

  const hasExplicitCache = options?.init?.cache !== undefined
  const disableCaching = hasAuthLikeHeaders(headers) && !hasExplicitCache

  const init: FetchInit = {
    ...options?.init,
    headers,
  }

  if (disableCaching) {
    init.cache = "no-store"
    delete init.next
  }

  const fetchInit: FetchInit = disableCaching
    ? init
    : {
        ...init,
        next: {
          ...(options?.init?.next ?? {}),
          revalidate: options?.revalidate,
          tags: Array.from(new Set([...(options?.init?.next?.tags ?? []), ...tags])),
        },
      }

  const res = await fetcher(url.toString(), fetchInit)

  if (!res.ok) {
    throw new Error(`View fetch failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as T
}
