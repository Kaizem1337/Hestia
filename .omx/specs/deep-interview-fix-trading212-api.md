# Execution Spec: Fix Trading 212 API

## Intent

Make the portfolio tracker's Trading 212 integration functional with the current Trading 212 Public API while preserving existing app contracts and user data.

## In Scope

- Update `src/lib/brokers/trading212.ts` for current auth and endpoint contracts.
- Update validation/UI copy so users can enter either `API_KEY:API_SECRET` or a legacy one-piece API key in the existing field.
- Add regression tests for the Trading 212 adapter.
- Update README wording where it references Trading 212 credentials.

## Out of Scope

- Schema migration for separate key/secret columns.
- Live credential testing.
- Trading/order placement.
- Broad portfolio model refactors.

## Constraints

- Keep credentials encrypted as one string via the existing broker connection flow.
- Maintain server-only credential handling.
- Keep old stored one-piece credentials usable.
- Keep changes local and reviewable.

## Acceptance Criteria

1. Account connection uses `GET /api/v0/equity/account/summary`.
2. Holding sync uses `GET /api/v0/equity/positions`.
3. Current position fields map to normalized holdings: ticker/name/ISIN/currency/quantity/average price.
4. Basic auth is generated only when the credential clearly contains a key/secret pair or is already a Basic header.
5. The single-field credential parser is deterministic:
   - `Basic ...` passes through.
   - `API_KEY:API_SECRET` splits on the first colon and becomes Basic auth.
   - no-colon strings remain legacy raw Authorization values.
   - blank strings are rejected before fetch.
6. Legacy one-piece credentials are sent as the raw `Authorization` header.
7. Cash balance is derived from account summary `cash.availableToTrade` without depending on removed/deprecated cash-specific parsing.
8. Tests validate the adapter behavior without real Trading 212 credentials.
