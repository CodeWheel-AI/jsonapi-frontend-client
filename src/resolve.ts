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

  const res = await fetcher(url.toString(), {
    ...options?.init,
    headers,
    next: {
      ...(options?.init?.next ?? {}),
      revalidate: options?.revalidate,
    },
  })

  if (!res.ok) {
    throw new Error(`Resolver failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as ResolveResponse
}
