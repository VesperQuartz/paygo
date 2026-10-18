# PayGo — never overpay

**An AI shopping assistant that finds any product, tells you whether the price is actually good, and watches it for you.**

Built for the **PayPal AI Hackathon 2026**.

**Live demo: https://paygo-jpwy.onrender.com**

## What it does

- **Search by intent.** Ask for "wireless earbuds under $200" and PayGo searches Channel3's universal product catalog — live results and offers across thousands of retailers, no keyword fiddling.
- **A price verdict, not just a price.** Every product page pulls 90 days of price history and today's merchant offers, then tells you plainly whether this is a good moment to buy (or whether you should wait).
- **Compare offers across merchants.** One product, every seller Channel3 knows about — prices and availability side by side, best deal highlighted.
- **Watch prices and get alerted.** Add products to your watchlist. Free accounts watch up to 3 items and check prices on demand; **PayGo Pro** ($4.99/mo) watches unlimited items and emails you when a price actually drops.
- **Real PayPal subscriptions.** The Pro upgrade is a genuine PayPal subscription: create → approve in the PayPal modal → PayGo verifies the subscription server-side before unlocking Pro.

## Free vs Pro

| Feature                         | Free                    | Pro — $4.99/mo        |
| ------------------------------- | ----------------------- | --------------------- |
| Product search & price verdicts | Unlimited               | Unlimited             |
| Watchlist                       | Up to 3 items           | Unlimited             |
| Price checks                    | On-demand ("Check now") | On-demand + scheduled |
| Price-drop emails               | —                       | Yes                   |

## How it works

```
Browser (React 19)
      │  typed server functions (Result envelopes)
      ▼
TanStack Start (SSR, Node)
  ├── Channel3 ──  search · offers · 90-day price history · recommendations
  ├── PayPal   ──  orders + subscriptions (sandbox)
  ├── Drizzle  ──  PostgreSQL on Render
  └── SMTP     ──  price-drop emails (React Email templates)

Alerts pipeline — Render Workflows ("paygo-alerts")
  Render cron job (daily)
      │  Render API: start task
      ▼
  runPriceAlerts               root task: fans out one run per watched product
      └── checkProductAlerts   one watched product per run:
                               fetch live price → email Pro drops → advance alert state
```

- The daily run fans out one independent task run per watched product — parallel instances, per-task retries, and full run history in the Render dashboard.
- Each item stores the price it was last alerted at, so it only emails again after dropping below that watermark — and only for Pro accounts, resolved server-side from the subscription table.
- "Check now" runs the same per-product logic inline for instant feedback; the secret-guarded `GET/POST /api/alerts/run` remains for manual or external scheduling.

### Sponsor tech

- **Channel3** — product search, multi-merchant offers, 90-day price history, and "more like this" recommendations.
- **PayPal** — subscriptions (Pro plan), plus sandbox order/capture flows for checkout.
- **Render** — web service, managed PostgreSQL, and the alert job as a **Render Workflow**: a daily cron dispatches the root task, which fans out per-product runs (`src/workflows/`).

### Engineering notes

- **Result-first services.** Service calls (Channel3, PayPal, mail) return `Result` values with tagged errors instead of throwing; raw upstream errors are mapped to user-safe messages at the edge and validated with runtime schemas. The audit lives in [`docs/better-result-adoption.md`](docs/better-result-adoption.md).
- **Alert idempotency.** Each watched item stores the price it was last alerted at, so an item only emails again after dropping below that watermark.
- **Fan-out with honest failure counts.** The workflow's root task fans out one task run per watched product (`Promise.allSettled`); a product still failing after platform retries is counted, never fatal to the rest of the batch.
- **Tests.** `pnpm run test` — unit tests for the domain logic (alerts, subscription, watchlist limits, wire codecs).

## Try the live demo

**https://paygo-jpwy.onrender.com**

A demo account is ready (Free tier, watched products included):

|          |                                     |
| -------- | ----------------------------------- |
| Email    | `lilbrown3000+paygo-test@gmail.com` |
| Password | `test-password-123`                 |

To try **Pro**, subscribe with a [PayPal sandbox buyer account](https://developer.paypal.com/tools/sandbox/accounts/) — the app runs entirely against PayPal's sandbox, so no real money moves. (Signing up yourself works too, but requires email verification.)

## Run locally

Prerequisites: Node 22+, pnpm, a PostgreSQL database, and a [Channel3](https://channel3.com) API key + [PayPal sandbox](https://developer.paypal.com) app.

Create a `.envrc` (or export) with:

| Variable                  | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `DB_URL`                  | PostgreSQL connection string               |
| `BETTER_AUTH_URL`         | App origin, e.g. `http://localhost:3000`   |
| `BETTER_AUTH_SECRET`      | Session/auth signing secret                |
| `CHANNEL3_API_KEY`        | Channel3 API key                           |
| `VITE_PAY_CLIENT_ID`      | PayPal client ID (client-side)             |
| `PAY_SECRET`              | PayPal client secret                       |
| `PAY_PRO_PLAN_ID`         | PayPal subscription plan ID for Pro        |
| `MAIL_USER` / `MAIL_PASS` | SMTP credentials for alert emails          |
| `ALERTS_SECRET`           | Shared secret guarding the alerts endpoint |
| `VITE_BASE_URL`           | Public base URL used in links/emails       |

```bash
pnpm install
pnpm run db:push    # apply the Drizzle schema
pnpm run dev        # http://localhost:3000
pnpm run test       # unit tests
pnpm run lint       # lint + format + typecheck (Vite+)
```

To run the alert workflow locally (needs the [Render CLI](https://render.com/docs/cli)):

```bash
pnpm run ts:build                                    # compile the task entry
render workflows dev -- node dist/workflows/index.mjs   # local task server on :8120
```

## Project layout

```
src/routes/     pages (/, /search, /product/$id, /watchlist, /pro, /login, /signup)
                + endpoints (/api/alerts/run, /api/auth/*)
src/actions/    server functions (auth, watchlist, alerts, subscription, paypal)
src/services/   mail + PayPal integrations
src/lib/        domain logic (alerts runner, Channel3, subscription, auth session)
src/repo/       Drizzle schema + repositories
src/workflows/  Render Workflow task definitions (price-alert fan-out)
src/scripts/    cron dispatch entry (starts the workflow's root task)
docs/           engineering notes
```

## License

MIT — see [LICENSE](LICENSE).
