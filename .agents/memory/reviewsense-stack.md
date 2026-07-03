---
name: ReviewSense AI Stack
description: Key decisions and gotchas for the ReviewSense AI application.
---

**Stack:** React+Vite (`artifacts/review-sense`) + Express API (`artifacts/api-server`) + PostgreSQL via Drizzle + OpenAI (user-provided key in OPENAI_API_KEY secret).

**Auth:** JWT via `jsonwebtoken`. Secret read from `SESSION_SECRET` env var — throws at startup if missing (no fallback). Token stored in `localStorage` under `rs_token`. Custom fetch (`lib/api-client-react/src/custom-fetch.ts`) auto-attaches token only to same-origin `/api/` paths.

**State management:** Zustand (`zustand` installed in `artifacts/review-sense`) for auth state via `src/hooks/use-auth.ts`.

**Demo accounts seeded via API:**
- `demo@reviewsense.ai` / `demo1234` (user role)
- `admin@reviewsense.ai` / `admin1234` (admin role — updated directly in DB)

**Analysis flow:** POST `/api/analyses` → creates record in `processing` state → background `setImmediate` job calls OpenAI to extract product info + analyze sentiment → updates record to `completed`. Frontend polls via `useGetAnalysis(id)` with `refetchInterval`.

**Why:** OpenAI `gpt-4o-mini` used for both product extraction (from URL) and batch sentiment analysis. No real web scraping — product info is inferred from URL structure by GPT.

**Orval collision rule:** Endpoints with BOTH path params AND query params generate colliding `Params` types. Fix: remove query params from those endpoints and handle filtering client-side, OR rename operationId to avoid the clash pattern.
