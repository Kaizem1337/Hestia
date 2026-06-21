# AI Slop Cleanup Report: Fix Trading 212 API

## Scope

- `src/lib/brokers/trading212.ts`
- `src/lib/brokers/trading212.test.ts`
- `src/app/(app)/brokers/page.tsx`
- `src/app/api/brokers/[id]/sync/route.ts`
- `src/lib/validation.ts`
- `README.md`
- `.env.example`

## Behavior Lock

- Added and ran `src/lib/brokers/trading212.test.ts`.
- Targeted test command passed: `cmd /c npm test -- --run src/lib/brokers/trading212.test.ts` (8 tests).
- Full suite passed: `cmd /c npm test` (39 tests).

## Cleanup Plan

1. Remove avoidable non-null assertions from the new connector mapping.
2. Keep compatibility branches only where they are grounded in API/version boundaries and covered by tests.
3. Avoid schema churn and speculative abstractions.

## Fallback Findings

- Legacy one-piece Trading 212 credentials: grounded compatibility fallback. It preserves existing encrypted connections and is covered by tests.
- Optional Trading 212 metadata failure: grounded fail-safe. The sync still returns positions from `/positions`, records a user-visible warning, and is covered by tests.
- README references to market-data fallback and symbol best-effort mapping are pre-existing project behavior and outside this scoped cleanup.

## Passes Completed

- Fallback-like code resolution gate: passed; no masking fallback slop introduced.
- Dead code deletion: no dead code found in scope.
- Duplicate removal: removed duplicate/forced narrowing in the positions mapping.
- Naming/error handling cleanup: credential errors now say credentials rather than only API key.
- Test reinforcement: added Trading 212 adapter tests for auth, endpoints, cash, positions, metadata warning, and ticker normalization.

## Quality Gates

- Regression tests: PASS.
- Full tests: PASS.
- Typecheck: PASS after Prisma client generation.
- Lint: PASS with one existing Next font warning in `src/app/layout.tsx`.
- Build: PASS with the same existing warning.

## Remaining Risks

- No live Trading 212 credential was available, so live API verification remains a manual smoke-test follow-up.
