<!-- markdownlint-disable-next-line MD041 -->
<div align="center">

<h1>StudyDeck AI — Web App</h1>

<p><strong>Organize your notes, find the cards due today, and practice what you haven’t learned yet.</strong></p>

<p>
<a href="https://github.com/diegnghtmr/studydeck-frontend/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/diegnghtmr/studydeck-frontend/ci.yml?branch=main&style=for-the-badge&labelColor=1F1F28&label=CI" alt="CI"></a>
<img src="https://img.shields.io/badge/React-19-E0C15A?style=for-the-badge&labelColor=1F1F28" alt="React 19">
<img src="https://img.shields.io/badge/TypeScript-6-E0C15A?style=for-the-badge&labelColor=1F1F28" alt="TypeScript 6">
<img src="https://img.shields.io/badge/Tailwind%20CSS-4-E0C15A?style=for-the-badge&labelColor=1F1F28" alt="Tailwind CSS 4">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-7FB4CA?style=for-the-badge&labelColor=1F1F28" alt="License: MIT"></a>
</p>

<p>
<a href="https://diegnghtmr.me/en/work/studydeck-ai/"><strong>Case study</strong></a> &bull;
<a href="#quick-start"><strong>Quick start</strong></a> &bull;
<a href="#architecture"><strong>Architecture</strong></a> &bull;
<a href="https://github.com/diegnghtmr/studydeck-backend"><strong>Backend API</strong></a>
</p>

</div>

<p align="center"><img width="100%" alt="StudyDeck dashboard with cards due today, an upcoming review, and six sample study decks" src="docs/assets/study-dashboard.png"></p>

StudyDeck brings notes, decks, and spaced repetition into one browser app. Open the dashboard to see what is due, reveal each answer before rating your recall, and let the scheduler decide what comes back next. If you generate cards from notes, you can edit or discard the drafts before adding them to a deck.

## Features

- **Daily study dashboard.** See cards due, your daily goal, and a deck to review next.
- **Deck and card library.** Organize study material by topic and narrow a deck’s cards by text or card type.
- **Recall sessions.** Reveal the answer, then rate it from Again to Easy to update the schedule.
- **JSON import.** Validate and preview a card import before committing it to a deck.
- **Editable AI drafts.** Review and select generated cards before importing them; generation alone does not save them.
- **Ask your notes.** Add source documents and use the backend’s retrieval and chat APIs to ask about their contents when a chat model is configured.

## Preview

![Night Sky Basics deck selected beside a grid of astronomy flashcards](docs/assets/deck-library.png)

*Browse a deck and filter its cards without starting a review.*

![Review card about circumpolar stars with its answer and four recall ratings](docs/assets/review-session.png)

*Ratings are available after the learner reveals the answer.*

## Quick start

Use Node.js 22 and pnpm 11.0.8, as in CI. The app shell can start without the backend, but decks, reviews, and document features need the [StudyDeck backend](https://github.com/diegnghtmr/studydeck-backend#quick-start).

```sh
git clone https://github.com/diegnghtmr/studydeck-frontend.git
cd studydeck-frontend
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open `http://localhost:5173`. Configure any overrides in a local `.env.local` file or in the process environment before starting Vite.

| Name | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | StudyDeck API origin | `http://localhost:8080` |
| `VITE_OIDC_AUTHORITY` | OIDC issuer URL | Unset |
| `VITE_OIDC_CLIENT_ID` | Public SPA client ID | Unset |
| `VITE_OIDC_REDIRECT_URI` | Browser callback registered with the identity provider | Unset |
| `VITE_OIDC_SCOPE` | Space-separated scopes | `openid profile email study.read` |
| `VITE_DEV_ACCESS_TOKEN` | Short-lived token for the backend’s development decoder | Unset |

For a local browser login, start the backend’s Keycloak overlay first. Then copy [the local OIDC example](env.idp.example) with `cp env.idp.example .env.local`, run `pnpm dev`, and sign in with the test account from the backend’s locally imported realm. Alternatively, with no OIDC settings, provide a development JWT from the backend as `VITE_DEV_ACCESS_TOKEN`; the frontend skips the OIDC login. Never put a real credential into a `VITE_` variable: these values are visible to the browser.

For a containerized build, the checked-in [Compose file](compose.yaml) serves the production bundle at `http://localhost:3000` with `docker compose up --build`. Vite reads its settings at build time; changing the container’s runtime `VITE_API_URL` does not rewrite the bundle served by nginx. Use the Vite setup above to change the API origin or try the local Keycloak login.

## Architecture

Routes and providers live in `src/app`. Feature slices own study, review, decks, documents, and AI screens; shared auth, API, and UI code lives under `src/shared`. TanStack Query handles server state and Zustand stores client state. The dashboard statistics call uses the shared Axios client directly where the checked-in contract does not have the endpoint.

```mermaid
flowchart LR
    Learner["Learner"] --> Web["React routes and feature slices"]
    Web -->|"OIDC sign-in"| IdP["Keycloak"]
    Web -->|"Queries and mutations"| Client["Shared Axios client"]
    Client -->|"HTTP / JSON"| API["studydeck-backend"]
    API -->|"API contract snapshot"| Contract["openapi.yaml"]
    Contract -->|"TypeScript Axios generation"| Client
```

### OpenAPI client generation

The generated TypeScript sources are committed in [`src/shared/api/generated/`](src/shared/api/generated/), so normal installs, builds, and CI need neither Java nor generation. When the backend contract changes, update the local [OpenAPI snapshot](openapi.yaml), then run `pnpm gen:api` and commit the updated source. This maintenance step needs Java 21+; the generator downloads its JAR on first use. Do not commit the `.js` or `.d.ts` compiler outputs.

## Tech stack

| Layer | Technology |
| --- | --- |
| Interface | React 19, TypeScript 6, React Router |
| Design | Tailwind CSS 4 `@theme` tokens in [`src/styles/app.css`](src/styles/app.css), with Inter and Fraunces |
| Data and state | TanStack Query, Axios, OpenAPI Generator, Zustand |
| Build and checks | pnpm, Vite, ESLint, Vitest, Playwright Chromium |

The CSS theme defines warm canvas (`#fbfaf9`), ember orange (`#ff3e00`), and graphite (`#474645`), with type sizes from 12px captions to 68px display text. Layout tokens start at 4px; tags, cards, and buttons use radii of 6px, 10px, and 32px respectively.

## Testing

```sh
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm test:watch` keeps Vitest running, `pnpm lint:fix` applies available fixes, and `pnpm preview` serves the built bundle. [CI](.github/workflows/ci.yml) installs from the lockfile, lints, runs Vitest, builds, and runs Playwright against the Vite server in a separate job. The [browser smoke tests](e2e/smoke.spec.ts) cover the app shell and sign-in route without a running API.

## Project structure

```text
src/
├── app/       # Router and providers
├── features/  # Decks, study, review, AI, documents, import, settings and auth
├── shared/    # Axios, generated bindings, auth and shared UI
├── styles/    # Color, type, spacing, radius and shadow tokens
└── test/      # Vitest setup
```

## Related repositories

| Repository | Role |
| --- | --- |
| [studydeck-backend](https://github.com/diegnghtmr/studydeck-backend) | Owns the OpenAPI contract, review scheduling, document retrieval, and persistence |

## License

Released under the [MIT License](LICENSE).
