# `@codewheel/jsonapi-frontend-client`

TypeScript client helpers for Drupal `drupal/jsonapi_frontend`.

This package is **optional**. You can always call `/jsonapi/resolve` directly with `fetch()`.

## Install

```bash
npm i @codewheel/jsonapi-frontend-client
```

## Usage

Set `DRUPAL_BASE_URL` (must be a full `http(s)://` URL), then:

```ts
import { resolvePath, fetchJsonApi } from "@codewheel/jsonapi-frontend-client"

const resolved = await resolvePath("/about-us")
if (resolved.resolved && resolved.kind === "entity") {
  const doc = await fetchJsonApi(resolved.jsonapi_url)
  console.log(doc.data)
}
```

## URL safety (recommended)

By default, `fetchJsonApi()` and `fetchView()` refuse to fetch absolute URLs on a different origin than your `DRUPAL_BASE_URL` (to avoid accidental SSRF in server environments).

If you intentionally need to fetch a cross-origin absolute URL, pass `allowExternalUrls: true`:

```ts
import { fetchJsonApi } from "@codewheel/jsonapi-frontend-client"

await fetchJsonApi("https://cms.example.com/jsonapi/node/page/...", {
  allowExternalUrls: true,
})
```
