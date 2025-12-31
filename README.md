# `@codewheel/jsonapi-frontend-client`

TypeScript client helpers for Drupal `drupal/jsonapi_frontend`.

This package is **optional**. You can always call `/jsonapi/resolve` directly with `fetch()`.

## Install

```bash
npm i @codewheel/jsonapi-frontend-client
```

## Usage

Set `DRUPAL_BASE_URL`, then:

```ts
import { resolvePath, fetchJsonApi } from "@codewheel/jsonapi-frontend-client"

const resolved = await resolvePath("/about-us")
if (resolved.resolved && resolved.kind === "entity") {
  const doc = await fetchJsonApi(resolved.jsonapi_url)
  console.log(doc.data)
}
```
