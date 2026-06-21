# Code Review Evidence: Fix Trading 212 API

## Initial Review

- Code-reviewer: REQUEST CHANGES.
- Finding: `.env.example` contained generated-looking `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, and `CRON_SECRET` values.
- Architect: WATCH.
- Finding: user-facing/request surface still modeled the opaque broker credential as `apiKey`.

## Fixes Applied

- Replaced `.env.example` secret values with inert placeholders while keeping generation instructions.
- Renamed client/request surface to `credential`.
- Kept `apiKey` only as a backward-compatible validation alias that transforms to `credential`.

## Recheck

- Code-reviewer: APPROVE, 0 issues.
- Architect: CLEAR.

## Verification Available To Reviewers

- `cmd /c npm test`: PASS, 39 tests.
- `cmd /c npm run typecheck`: PASS.
- `cmd /c npm run lint`: PASS with pre-existing `src/app/layout.tsx` font warning.
- `cmd /c npm run build`: PASS with same warning.
