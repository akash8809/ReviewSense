# ReviewSense AI

AI-powered product review analyzer: paste a URL or upload a CSV of reviews and get sentiment analysis, trend predictions, strengths/weaknesses, and business insights powered by OpenAI and Google Gemini.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — build + start the API server (uses PORT env var)
- `pnpm --filter @workspace/review-sense run dev` — start the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes to the development database (dev only)

## Required Secrets

- `SESSION_SECRET` — JWT signing secret (already set)
- `OPENAI_API_KEY` — OpenAI API key for analysis
- `GEMINI_API_KEY` — Google Gemini API key for analysis
- `DATABASE_URL` — managed automatically by Replit (do not set manually)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Wouter (routing), TanStack Query, Zustand, Radix UI
- **API**: Express 5, esbuild bundled to `dist/index.mjs`
- **DB**: PostgreSQL + Drizzle ORM (schema in `lib/db/src/schema/`)
- **AI**: OpenAI SDK + Google Generative AI (Gemini)
- **Validation**: Zod v4, drizzle-zod, Orval-generated hooks from OpenAPI spec
- **Auth**: JWT via `jsonwebtoken`, secret from `SESSION_SECRET`

## Where things live

- `artifacts/api-server/src/` — Express app, routes, and lib (auth, openai, gemini, analyzer)
- `artifacts/review-sense/src/` — React frontend, pages, components, hooks
- `lib/db/src/schema/` — Drizzle table definitions (users, analyses, reviews)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/src/` — Zod schemas generated from OpenAPI spec
- `lib/api-client-react/src/` — React hooks for API calls

## Architecture decisions

- API server bundles to ESM with esbuild before running (not ts-node/tsx at runtime) — fast cold start, no runtime transpilation
- Shared libs (`lib/*`) use direct `src/` TypeScript exports (no build step needed for libs)
- Auth uses JWT stored in `Authorization: Bearer` header, not cookies
- Both OpenAI and Gemini are supported; the analyzer picks the configured provider
- Frontend routes relative to `import.meta.env.BASE_URL` for proxy compatibility

## Gotchas

- `DATABASE_URL` is runtime-managed by Replit — never set it manually
- The API server must be rebuilt (`pnpm run build`) before changes take effect in dev
- `SESSION_SECRET` must be set or the API server will throw at startup
- Path alias `@/` in the frontend resolves to `artifacts/review-sense/src/`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
