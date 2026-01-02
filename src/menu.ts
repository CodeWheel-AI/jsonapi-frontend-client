import { MenuResponse } from "./types.js"
import { FetchInit, FetchLike, getDrupalBaseUrlFromOptions, getFetch, mergeHeaders } from "./transport.js"

export async function fetchMenu(
  menu: string,
  options?: {
    baseUrl?: string
    envKey?: string
    path?: string
    langcode?: string
    resolve?: boolean
    revalidate?: number
    fetch?: FetchLike
    headers?: HeadersInit
    init?: FetchInit
  }
): Promise<MenuResponse> {
  const base = getDrupalBaseUrlFromOptions({ baseUrl: options?.baseUrl, envKey: options?.envKey })
  const fetcher = getFetch(options?.fetch)

  const url = new URL(`/jsonapi/menu/${encodeURIComponent(menu)}`, base)
  url.searchParams.set("_format", "json")

  if (options?.path) {
    url.searchParams.set("path", options.path)
  }
  if (options?.langcode) {
    url.searchParams.set("langcode", options.langcode)
  }
  if (options?.resolve === false) {
    url.searchParams.set("resolve", "0")
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
    throw new Error(`Menu fetch failed: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as MenuResponse
}

