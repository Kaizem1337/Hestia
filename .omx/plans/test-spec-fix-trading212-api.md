# Test Spec: Fix Trading 212 API

## Unit Tests

- Mock `global.fetch` and assert `testConnection` calls `/api/v0/equity/account/summary`.
- Assert `API_KEY:API_SECRET` becomes a Basic Authorization header.
- Assert `API_KEY:SECRET:WITH:COLONS` splits only at the first colon.
- Assert a prebuilt `Basic ...` header passes through unchanged.
- Assert a legacy one-piece credential is sent unchanged as the Authorization header.
- Assert blank credentials are rejected without calling fetch.
- Mock summary, positions, and instruments responses and assert normalized holdings contain:
  - source `TRADING212`
  - position quantity
  - `averagePricePaid` as `avgCost`
  - instrument currency/name/ISIN
  - account name from summary id
- Assert `summary.cash.availableToTrade` is returned as the cash balance amount in the summary currency.
- Force metadata request failure and assert sync still returns holdings plus a warning.
- Keep ticker normalization regressions for common exchange suffixes.

## Command Checks

- `npm test`
- `npm run typecheck`
- `npm run lint`

## Blocked / Manual Checks

- A live Trading 212 demo sync cannot be performed without user credentials. This should be reported as a verification gap, not hidden.
