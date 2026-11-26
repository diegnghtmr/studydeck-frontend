# StudyDeck Web reference

## Environment and authentication

Vite reads overrides from the process environment or a local `.env.local` file before starting the server or building the bundle.

| Name | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | StudyDeck API origin | `http://localhost:8080` |
| `VITE_OIDC_AUTHORITY` | OpenID Connect issuer URL | Unset |
| `VITE_OIDC_CLIENT_ID` | Public SPA client ID | Unset |
| `VITE_OIDC_REDIRECT_URI` | Callback URL registered with the identity provider | Unset |
| `VITE_OIDC_SCOPE` | Space-separated scopes for the OIDC request | `openid profile email study.read` |
| `VITE_DEV_ACCESS_TOKEN` | Optional bearer token for the backend’s local development decoder | Unset |

All three of authority, client ID, and redirect URI must be set for OIDC mode. If those settings are incomplete, the app shell can render without OIDC; it still needs an accepted bearer token for protected API calls. Set `VITE_DEV_ACCESS_TOKEN` to a short-lived token minted for the matching backend’s `dev` profile to try those calls without an identity provider. `VITE_` values are visible to the browser, so never use a production secret for this path.

To test browser sign-in, start the backend’s Keycloak overlay as described in the [backend reference](https://github.com/diegnghtmr/studydeck-backend/blob/master/docs/reference.md) and set up the frontend from the repository root:

```sh
cp env.idp.example .env.local
pnpm dev
```

The [local example](../env.idp.example) uses realm `studydeck` on port `8081`, public client `studydeck-spa`, and callback `http://localhost:5173/auth/callback`. Sign in using the local account from the imported development realm; do not use that account in a deployment. To run against a backend on another port without changing any file, set `VITE_API_URL` before `pnpm dev`.

## OpenAPI client generation

[`openapi.yaml`](../openapi.yaml) is a snapshot of the backend’s contract. The generated TypeScript Axios sources are checked in under [`src/shared/api/generated/`](../src/shared/api/generated/). Java and generation are not part of normal development, builds, tests, or CI. The dashboard statistics request uses the shared Axios client directly where the snapshot does not include the endpoint.

When the API contract changes, update the snapshot, put a Java runtime on your `PATH`, and run `pnpm gen:api`. The generator JAR is retrieved on the first run and pinned by [`openapitools.json`](../openapitools.json). Commit the updated TypeScript sources with the snapshot, not the generated directory’s ignored `.js`, `.d.ts`, or `.tsbuildinfo` compiler outputs.

## Design tokens

The CSS-first Tailwind 4 `@theme` lives in [`src/styles/app.css`](../src/styles/app.css).

| Family | Examples |
| --- | --- |
| Color | Warm canvas `#fbfaf9`, ember orange `#ff3e00`, graphite `#474645` |
| Typography | Inter and Fraunces; 12px captions through 68px display type |
| Spacing | 4px base, with named steps through 104px |
| Corners | 6px tags, 10px cards, 32px buttons |
| Shadows and outlines | Subtle inset stone edge for cards and a separate navigation outline |

## Scripts and browser tests

| Command | Purpose |
| --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | Reproduce the CI dependency installation from the lockfile |
| `pnpm dev` | Start the Vite development server at `http://localhost:5173` |
| `pnpm build` | Type-check with `tsc -b` and build the production bundle |
| `pnpm preview` | Serve a previously built bundle |
| `pnpm test` / `pnpm test:watch` | Run Vitest once / in watch mode |
| `pnpm lint` / `pnpm lint:fix` | Report / apply available ESLint fixes |
| `pnpm exec playwright install chromium` | Install the browser for local smoke tests |
| `pnpm test:e2e` | Run Playwright against Vite |
| `pnpm gen:api` | Regenerate the TypeScript Axios bindings |

When run locally, Playwright starts Vite if it is not already running. In [CI](../.github/workflows/ci.yml), the dedicated E2E job installs Chromium and starts Vite before running the suite. The [smoke tests](../e2e/smoke.spec.ts) check the root and login routes and do not need a live backend.

## Docker

`docker compose up --build` builds and serves the bundle at `http://localhost:3000`. The [Dockerfile](../Dockerfile) builds with Node and serves static files from nginx. The `VITE_API_URL` environment entry in [Compose](../compose.yaml) is a runtime setting, not a build argument, and nginx does not rewrite the compiled bundle. Use Vite for local development with hot reload or custom API and OIDC settings.
