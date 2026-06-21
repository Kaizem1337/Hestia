# PRD: Fix Trading 212 API Compatibility

## Requirements Summary

The existing Trading 212 adapter must be updated for the current public API while keeping the tracker's existing broker connection model intact. The main compatibility gaps are obsolete endpoint paths and outdated auth assumptions in `src/lib/brokers/trading212.ts`.

## RALPLAN-DR Summary

### Principles

- Preserve existing encrypted credential storage.
- Prefer official current API contracts over inferred legacy behavior.
- Keep backward compatibility for existing stored legacy keys.
- Verify adapter behavior with deterministic unit tests.

### Decision Drivers

- Trading 212's current docs use `/account/summary` and `/positions`.
- Current docs prefer Basic auth with an API key and API secret.
- The app stores one encrypted credential string and should avoid a migration for a focused API fix.

### Viable Options

- Option A: keep one credential field and accept `API_KEY:API_SECRET` plus legacy one-key values.
  - Pros: no schema migration, existing connections remain usable, minimal UI/API churn.
  - Cons: users must understand the combined key/secret format.
- Option B: split API key and API secret into separate DB fields.
  - Pros: clearer form semantics.
  - Cons: migration, larger surface area, more regression risk for a small compatibility fix.

Chosen option: Option A. Option B is rejected because schema churn is unnecessary for the requested fix and would not improve runtime compatibility.

## Implementation Steps

1. Update `src/lib/brokers/trading212.ts`:
   - Add credential-to-Authorization-header formatting.
   - Define the one-field credential contract explicitly:
     - `Basic <base64>` values are passed through unchanged for advanced/manual compatibility.
     - `API_KEY:API_SECRET` values are converted to HTTP Basic by splitting only on the first colon, so secrets may contain additional colons.
     - Values without a colon are treated as legacy one-piece API keys and sent as the raw `Authorization` header.
     - Blank/whitespace-only credentials are rejected before any provider call.
   - Use `/api/v0/equity/account/summary` for test connection and cash/account metadata.
   - Map summary `cash.availableToTrade` into `BrokerSyncResult.cash`, falling back to no cash row when unavailable.
   - Use `/api/v0/equity/positions` for sync.
   - Map nested `instrument` and `averagePricePaid` response fields.
2. Update validation/UI/docs:
   - Allow a longer combined credential string in `src/lib/validation.ts`.
   - Change Brokers page label/help text in `src/app/(app)/brokers/page.tsx`.
   - Update README Trading 212 credential wording.
3. Add unit tests in `src/lib/brokers/trading212.test.ts`:
   - Basic auth credential formatting.
   - Legacy credential formatting.
   - Account summary and positions mapping.
   - Metadata failure warning behavior.
   - Ticker normalization regression.
4. Run `npm test`, `npm run typecheck`, and `npm run lint`.

## Risks and Mitigations

- Risk: live API behavior differs from docs. Mitigation: tests mock documented response shapes and final report states live credentials were unavailable.
- Risk: Basic credentials containing colons in the secret could be split incorrectly. Mitigation: split on the first colon only.
- Risk: existing one-key stored credentials break. Mitigation: preserve legacy raw `Authorization` behavior for strings without a colon.
- Risk: a single form field is less explicit than two fields. Mitigation: make label/help text say "API key + secret", show the `API_KEY:API_SECRET` format, and keep backend parsing deterministic with tests.

## ADR

- Decision: keep the existing single encrypted credential field and make the adapter interpret either a combined key/secret credential or legacy raw key.
- Drivers: focused fix, backward compatibility, no migration, official API alignment.
- Alternatives considered: separate persisted key and secret fields; rejected due avoidable schema/UI churn.
- Why chosen: it makes the API work with current docs while keeping the smallest safe blast radius.
- Consequences: UI copy must explain the combined format; long-term polish could split the fields later.
- Follow-ups: live-credential smoke test when the user has Trading 212 demo credentials available.

## Verification Plan

- Unit tests for adapter behavior.
- TypeScript typecheck.
- ESLint.
- Existing full Vitest suite.
