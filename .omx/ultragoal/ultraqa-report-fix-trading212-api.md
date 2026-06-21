# UltraQA Report: Fix Trading 212 API

## Goal and Success Criteria

- Goal: Trading 212 connect/sync works against the current API contract without breaking existing legacy connections.
- Stop condition: current endpoint/auth behavior is covered by tests, full repo checks pass, review gate is clean, and safe adversarial probes do not reveal regressions.
- Safety bounds: no live Trading 212 calls and no credential exfiltration; all provider behavior is mocked.

## Scenario Matrix

| ID | Scenario | Expected Signal | Actual Result | Status | Cleanup |
|----|----------|-----------------|---------------|--------|---------|
| QA-001 | Current `API_KEY:API_SECRET` credential | Basic Authorization header, first-colon split | Unit tests pass for Basic auth and secrets containing extra colons | PASS | N/A |
| QA-002 | Legacy one-piece credential | Raw Authorization header preserved | Unit tests pass and sync mock sees `legacy-api-key` unchanged | PASS | N/A |
| QA-003 | Blank credential | No provider fetch; user-facing auth failure | Unit test passes and `fetch` is not called | PASS | N/A |
| QA-004 | Current account summary + positions response | Uses `/account/summary`, `/positions`, maps cash/positions | Unit tests pass with documented response shapes | PASS | N/A |
| QA-005 | Optional metadata endpoint failure | Holdings still sync with a warning | Unit test passes and warning is preserved | PASS | N/A |
| QA-006 | Old request body still uses `apiKey` | Validation transforms it to `credential` | `npx tsx` harness prints normalized legacy/current outputs | PASS | No file created |
| QA-007 | Removed/obsolete endpoint strings | No old Trading 212 endpoint strings remain | `rg` found no `account/info`, `equity/portfolio`, or `equity/account/cash` in `src`/README | PASS | N/A |
| QA-008 | Example env secret hygiene | No generated-looking template secrets remain | `rg --pcre2` found no non-placeholder `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, or `CRON_SECRET` in `.env.example` | PASS | N/A |
| QA-009 | Misleading success output | Build/lint/test exit codes checked, not only success text | Commands exited 0; lint/build warning is pre-existing font warning | PASS | N/A |

## Commands Run

- `[0] cmd /c npm test -- --run src/lib/brokers/trading212.test.ts` - targeted adapter regression tests, 8 passed.
- `[0] cmd /c npm test` - full Vitest suite, 39 passed.
- `[0] cmd /c npx prisma generate` - regenerated Prisma client after stale local generated types.
- `[0] cmd /c npm run typecheck` - TypeScript check passed.
- `[0] cmd /c npm run lint` - lint passed with existing `src/app/layout.tsx` font warning.
- `[0] cmd /c npm run build` - production build passed with the same warning.
- `[0] cmd /c npx tsx -e ...` - validation harness proved old `apiKey` and new `credential` inputs normalize to `credential`.
- `[1] rg -n 'account/info|equity/portfolio|equity/account/cash' src README.md` - no obsolete endpoint strings found; exit 1 means no matches.
- `[1] rg --pcre2 ... .env.example` - no generated-looking template secrets found; exit 1 means no matches.

## Fixes Applied

- Replaced old Trading 212 endpoints with current account summary and positions endpoints.
- Added deterministic credential formatting for `Basic ...`, `API_KEY:API_SECRET`, and legacy one-piece credentials.
- Mapped account summary `cash.availableToTrade` into cash balances.
- Mapped current position `instrument` and `averagePricePaid` fields into normalized holdings.
- Updated broker UI/request surface to use `credential`, with server-side `apiKey` compatibility.
- Replaced real-looking `.env.example` secrets with inert placeholders.
- Added focused Trading 212 adapter tests.

## Residual Risks

- Live Trading 212 validation was not run because no demo/live credentials are available in this workspace.
- `apiKey` compatibility alias should be removed in a future cleanup once old clients are no longer relevant.
