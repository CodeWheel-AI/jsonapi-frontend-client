export type NextFetchOptions = {
  revalidate?: number
  tags?: string[]
}

/**
 * Fetch init that is compatible with both standard Fetch and Next.js fetch extensions.
 */
export type FetchInit = RequestInit & {
  next?: NextFetchOptions
}

export type FetchLike = (input: RequestInfo | URL, init?: FetchInit) => Promise<Response>

function getEnvString(key: string): string | undefined {
  const value = (globalThis as unknown as { process?: { env?: Record<string, unknown> } }).process?.env?.[key]
  return typeof value === "string" && value.trim() !== "" ? value : undefined
}

export function getDrupalBaseUrlFromOptions(options?: { baseUrl?: string; envKey?: string }): string {
  const rawBaseUrl = options?.baseUrl ?? getEnvString(options?.envKey ?? "DRUPAL_BASE_URL")
  if (!rawBaseUrl) {
    throw new Error(`Missing Drupal base URL (pass baseUrl or set ${options?.envKey ?? "DRUPAL_BASE_URL"})`)
  }

  let parsed: URL
  try {
    parsed = new URL(rawBaseUrl)
  } catch {
    throw new Error(`Invalid Drupal base URL "${rawBaseUrl}" (expected http(s) URL)`)
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Invalid Drupal base URL protocol "${parsed.protocol}" (expected http/https)`)
  }

  return parsed.toString().replace(/\/$/, "")
}

export function getFetch(fetchLike?: FetchLike): FetchLike {
  const f = fetchLike ?? (globalThis as unknown as { fetch?: unknown }).fetch
  if (!f) {
    throw new Error("No fetch implementation available. Provide options.fetch or use Node 18+/modern browsers.")
  }
  return f as FetchLike
}

export function mergeHeaders(...headersList: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers()
  for (const list of headersList) {
    if (!list) continue
    new Headers(list).forEach((value, key) => headers.set(key, value))
  }
  return headers
}
