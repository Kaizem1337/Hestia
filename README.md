# Portfolio Tracker

A secure, multi-currency portfolio tracker. Log in, add holdings manually or by
importing from Interactive Brokers (IBKR) and Trading 212, keep watchlists,
pull live market prices from Yahoo Finance, and see everything converted into a
base currency of your choice while preserving each instrument's native currency.

Built with **Next.js 14 (App Router) + TypeScript**, **Tailwind CSS**,
**Prisma + SQLite** (zero-setup local dev; Postgres-ready), and
**NextAuth (Auth.js)**.

---

## Features

- **Secure auth** — registration, login/logout, JWT sessions, password reset
  flow, bcrypt password hashing, server-side protected routes, secure cookies,
  and strict per-user data isolation (every record is scoped by `userId`).
- **Profile & settings** — edit name, email, avatar (local file or data-URL
  storage), base currency, price-refresh interval, and light/dark/system theme.
- **Manual holdings** — add positions via a debounced symbol search/autocomplete
  that supports international tickers (`AAPL`, `000660`, `0189.HK`).
- **IBKR import** — upload an IBKR Activity Statement (CSV); the parser reads
  Open Positions + Financial Instrument Information, maps symbols/ISIN/exchange/
  quantity/avg cost/currency, shows a preview, reports skipped rows, and avoids
  duplicates (with an opt-in merge/update).
- **Trading 212 sync** — connect with an API key + secret (encrypted at rest,
  never sent to the browser), then sync holdings and cash. Errors, invalid
  credentials, and rate limits are handled gracefully with last-sync status.
- **Watchlists** — add/remove symbols manually or import a `basket.xlsx`
  (supports the documented `Symbol/Company Name/Exchange/Currency/Notes` layout
  **and** real Bloomberg-style baskets like `009150 KS Equity`).
- **Live prices** — Yahoo Finance quotes via the crumb-free `chart` endpoint
  (no cookie/crumb handshake), with **Stooq** CSV as an automatic fallback,
  cached server-side, a manual refresh button and a background refresh
  job/endpoint. Stale/unavailable symbols are flagged, not fatal.
- **Base currency system** — portfolio totals, gains/losses and allocation are
  converted into your base currency (USD, GBP, EUR, HKD, JPY, KRW, CAD, AUD,
  CHF, SGD, …) using cached FX rates, while each holding keeps its native value.
- **Dashboard** — overview stat cards, allocation donut chart, holdings table,
  and watchlist panel, with loading/empty/error states, toasts, dark mode, and
  a responsive layout.

---

## Architecture & key decisions

- **Adapter patterns** so providers are swappable without touching the app:
  - Market data: `src/lib/market-data` (Yahoo implementation + `MarketDataProvider` interface).
  - FX: `src/lib/fx` (`FxProvider` interface + Yahoo FX pairs).
  - Brokers: `src/lib/brokers` (`BrokerConnector` for API brokers like Trading 212;
    isolated, testable import parsers for IBKR CSV and basket XLSX).
  - Avatar storage: `src/lib/storage` (`local` filesystem or `dataurl`).
- **Security**: broker tokens are encrypted with **AES-256-GCM** (`src/lib/crypto.ts`)
  using `ENCRYPTION_KEY`; passwords hashed with bcrypt; all mutating API routes
  re-check the session and scope queries by `userId`; tokens are never returned
  to the client (only a `hasToken` flag).
- **Validation**: every API body is validated with **Zod** (`src/lib/validation.ts`).
- **Market data caching**: `PriceQuote` and `FxRate` are global caches keyed by
  symbol / currency pair, with a configurable minimum refresh window
  (`PRICE_MIN_REFRESH_SECONDS`) to respect provider limits.
- **No web fonts / no external runtime calls at build**: the UI uses a system
  font stack to keep builds hermetic.
- **System fonts + CSS variables** drive the theme (light/dark) with no flash on
  load.

### Project structure

```
src/
  app/
    (app)/              # authenticated shell: dashboard, holdings, watchlist,
                        # import, brokers, settings
    api/                # route handlers (auth, holdings, watchlists, search,
                        # prices, brokers, import, profile, settings, cron)
    login | register | forgot-password | reset-password
  components/           # UI kit (ui/), layout, dashboard, holdings, watchlist,
                        # import, auth, symbol-search
  lib/
    auth.ts auth-helpers.ts password.ts   # auth
    crypto.ts env.ts validation.ts api.ts # security/infra
    market-data/  fx/  brokers/  storage/ # adapters
    portfolio/  watchlist/                # domain services
prisma/schema.prisma    # data model
scripts/refresh-prices.ts
samples/                # the provided IBKR CSV + basket.xlsx, for testing
```

---

## Getting started

### Prerequisites

- Node.js 18.18+ (or 20+)
- No database server needed — SQLite is stored in a local file (`prisma/dev.db`).

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# then edit .env (see the table below)
```

Generate secrets:

```bash
# NEXTAUTH_SECRET and ENCRYPTION_KEY (run twice for two different values)
openssl rand -base64 32
```

### 3. Set up the database

```bash
npx prisma generate        # generate the typed client
npx prisma migrate dev     # create the schema (first run names the migration)
npm run db:seed            # optional: demo user demo@portfolio.local / demo12345
```

### 4. Run

```bash
npm run dev
# open http://localhost:3000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file URL, e.g. `file:./dev.db` (or a Postgres URL if you switch the datasource). |
| `NEXTAUTH_URL` | prod | Canonical app URL (e.g. `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | yes | Secret for signing session JWTs (`openssl rand -base64 32`). |
| `ENCRYPTION_KEY` | yes | 32-byte key for AES-256-GCM token encryption. |
| `CRON_SECRET` | for cron | Shared secret to authorize `POST /api/cron/refresh`. |
| `AVATAR_STORAGE_DRIVER` | no | `local` (default) or `dataurl`. |
| `PRICE_MIN_REFRESH_SECONDS` | no | Min seconds between provider refreshes (default 60). |
| `TRADING212_LIVE_BASE_URL` | no | Defaults to `https://live.trading212.com`. |
| `TRADING212_DEMO_BASE_URL` | no | Defaults to `https://demo.trading212.com`. |

Never commit `.env`. See `.env.example` for a documented template.

---

## Background price refresh

Pick whichever fits your deployment:

- **HTTP (recommended for serverless / Vercel Cron / GitHub Actions):**

  ```bash
  curl -X POST https://your-app/api/cron/refresh \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

- **Node script (system cron):**

  ```bash
  # every 15 minutes
  */15 * * * *  cd /path/to/app && npm run refresh:prices
  ```

The in-app **Refresh** button triggers an immediate refresh for the current
user, and the per-user "price refresh interval" preference is stored in
settings to drive automated runs.

---

## Sample data

The `samples/` folder contains the two provided files for quick testing:

- `samples/ibkr-holdings-sample.csv` → **Import → IBKR holdings**
- `samples/basket-sample.xlsx` → **Watchlist → Import basket.xlsx**

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server. |
| `npm run build` | `prisma generate` + production build. |
| `npm start` | Start the production server. |
| `npm run lint` | ESLint (next/core-web-vitals). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Vitest unit tests. |
| `npm run prisma:migrate` | Create/apply a dev migration. |
| `npm run db:seed` | Seed a demo account. |
| `npm run refresh:prices` | One-off price + FX refresh. |

---

## Testing

Unit tests cover the parsing/normalization logic most likely to break:

- `src/lib/symbols.test.ts` — ticker normalization (IBKR/Bloomberg/Yahoo).
- `src/lib/brokers/ibkr-import.test.ts` — IBKR CSV parsing (incl. quoted
  thousands separators and Total-row skipping).
- `src/lib/brokers/basket-import.test.ts` — basket.xlsx parsing (both layouts).
- `src/lib/utils.test.ts` — currency/percent formatting and FX conversion.

```bash
npm test
```

---

## Known limitations & recommended next steps

- **Password-reset email** is logged to the server console in dev (swap
  `src/lib/mailer.ts` for SES/Resend/Postmark/SMTP in production).
- **Trading 212 → Yahoo symbol mapping** is best-effort for non-US instruments
  (Trading 212 doesn't expose exchange suffixes); US tickers map cleanly.
- **Avatars** use local disk by default — for multi-instance/serverless deploys
  switch `AVATAR_STORAGE_DRIVER=dataurl` or implement an S3/GCS `AvatarStorage`.
- **Yahoo Finance** is an unofficial free source; for production scale consider a
  paid provider — just implement `MarketDataProvider`/`FxProvider`.
- **Historical performance chart** shows current allocation; a time-series
  endpoint + snapshot table would enable a value-over-time chart.
- **Automated scheduling** is provided via the cron endpoint/script; wiring it to
  the per-user interval preference end-to-end is a good follow-up.

> Cleanup note: a leftover `.nm_broken/` folder may exist in this directory (a
> broken first-attempt dependency install that the build sandbox could not
> delete). It is safe to delete manually; it is git-ignored and excluded from
> TypeScript.
