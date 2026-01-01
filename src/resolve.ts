import { ResolveResponse } from "./types.js"
import { FetchInit, FetchLike, getDrupalBaseUrlFromOptions, getFetch, mergeHeaders } from "./transport.js"

/**
 * Resolve a frontend path to a Drupal resource.
 */
export async function resolvePath(
  path: string,
  options?: {
    baseUrl?: string
    envKey?: string
    langcode?: string
    revalidate?: number
    fetch?: FetchLike
    headers?: HeadersInit
    init?: FetchInit
  }
): Promise<ResolveResponse> {
  const base = getDrupalBaseUrlFromOptions({ baseUrl: options?.baseUrl, envKey: options?.envKey })
  const fetcher = getFetch(options?.fetch)

  const url = new URL("/jsonapi/resolve", base)
  url.searchParams.set("path", path)
  url.searchParams.set("_format", "json")
  if (options?.langcode) {
    url.searchParams.set("langcode", options.langcode)
  }

  const headers = mergeHeaders(options?.init?.headers, options?.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/vnd.api+json")
  }

  const hasExplicitCache = options?.init?.cache !== undefined
  const disableCaching = (headers.has("authorization") || headers.has("cookie")) && !hasExplicitCache

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
        },
      }

  const res = await fetcher(url.toString(), fetchInit)

  if (!res.ok) {
    throw new Error(`Resolver failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as ResolveResponse
}
