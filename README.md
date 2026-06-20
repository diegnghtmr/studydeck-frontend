# StudyDeck Frontend

React 19 + TypeScript 6 + Tailwind CSS 4 frontend for the StudyDeck AI platform.

## Requirements

- Node 22+
- pnpm 11+
- Java 21+ (for OpenAPI client generation)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Run unit tests (Vitest)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint
pnpm lint
pnpm lint:fix

# Type check + build
pnpm build

# Preview production build
pnpm preview
```

## OpenAPI Client Generation

The API client is generated from `openapi.yaml` using `openapi-generator-cli` (typescript-axios):

```bash
pnpm gen:api
```

Generated files land in `src/shared/api/generated/` (git-ignored). Re-run after any changes to `openapi.yaml`.

> Requires Java 21+. JDK is downloaded automatically by the CLI on first run.

## Docker

### Production build

```bash
# Build and start the container
docker compose up --build

# The app is served at http://localhost:3000
```

### Dev story

Use `pnpm dev` directly for local development (Vite HMR, instant reload):

```bash
VITE_API_URL=http://localhost:8080 pnpm dev
```

Copy `.env.example` to `.env.local` and adjust `VITE_API_URL` as needed.

## Project Structure

```
src/
├── app/               # App-level wiring
│   ├── providers/     # QueryClientProvider, etc.
│   └── router/        # BrowserRouter + Routes
├── features/          # Feature slices
│   ├── decks/         # Deck list, dashboard
│   ├── review/        # Review session (placeholder)
│   └── auth/          # Auth (placeholder)
├── shared/            # Cross-cutting concerns
│   ├── api/           # Axios instance + generated client
│   ├── lib/           # cn(), Zustand store
│   └── ui/            # Shared components (NavBar, etc.)
├── styles/            # app.css (Tailwind @theme tokens)
└── test/              # Vitest setup
```

## Design Tokens

Design tokens are defined in `src/styles/app.css` using Tailwind 4 `@theme` (CSS-first config). They come from the project design system and include:

- **Colors**: warm canvas `#fbfaf9`, ember orange `#ff3e00`, graphite `#474645`, etc.
- **Typography**: Inter for UI, scale from 12px caption to 68px display
- **Spacing**: 4px base unit, scale to 104px
- **Radius**: tags 6px, cards 10px, buttons 32px
- **Shadows**: subtle inset stone border for cards, nav outline

## E2E Tests

```bash
# Install Playwright browsers (first time)
pnpm exec playwright install chromium

# Run e2e tests (requires dev server running)
pnpm test:e2e
```

In CI, e2e tests are skipped (no browser server available without a running backend).
