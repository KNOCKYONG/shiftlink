# Repository Guidelines

## Project Structure & Module Organization
- `app/` Next.js App Router routes, layouts, and styles (`globals.css`).
- `components/` Reusable UI (React, `.tsx`).
- `lib/` Domain logic and utilities (e.g., `scheduler/`, `supabase/`, `utils/`).
- `supabase/` SQL schema, migrations, and deployment scripts.
- `tests/` Unit/integration and Playwright E2E specs.
- `scripts/` Helper scripts for schema, seeding, and deploy.
- `public/` Static assets.

## Build, Test, and Development Commands
- `npm run dev` Start Next.js locally (Turbopack, port 3003).
- `npm run build` Production build.
- `npm start` Serve built app.
- `npm run lint` / `npm run lint:fix` Lint (Next + ESLint) / autofix.
- `npm run type-check` TypeScript checks (strict mode).
- `npm test` / `npm run test:watch` Vitest unit tests.
- `npm run test:coverage` Vitest with coverage (80% global thresholds).
- `npm run test:e2e` Playwright E2E tests.
- `npm run test:all` Lint, type-check, unit, and E2E in sequence.

Tip: E2E expects `http://localhost:3000`. When using `dev` (3003), set `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3003`.

## Coding Style & Naming Conventions
- TypeScript, strict: prefer explicit types at module boundaries.
- ESLint extends `next/core-web-vitals`; fix warnings before merging.
- Components: PascalCase files in `components/` (e.g., `NotificationBell.tsx`).
- Modules/Utilities: kebab-case in `lib/` (e.g., `schedule-engine.ts`).
- Prefer named exports; use `@/` alias for root imports.

## Testing Guidelines
- Unit/Integration: Vitest + JSDOM; name files `*.spec.ts(x)` or `*.test.ts(x)` colocated or under `tests/`.
- Coverage: keep global coverage ≥ 80% (`npm run test:coverage`).
- E2E: Playwright specs under `tests/`; run with `npm run test:e2e`.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (e.g., `feat:`, `fix:`, `chore:`). Keep messages imperative and scoped.
- PRs: Clear description, linked issue, screenshots for UI changes, and notes on testing/impact.
- Require green `npm run test:all` locally before requesting review.

## Security & Configuration
- Never commit secrets. Use `.env.local` for local config.
- Supabase: schemas and migrations live in `supabase/`; review SQL carefully.
- Scripts: see `scripts/` (e.g., `deploy.sh`, seeding and schema helpers) for common workflows.
