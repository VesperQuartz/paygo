# PayGo — Devpost submission draft

> Internal notes (delete before pasting): repo `github.com/VesperQuartz/paygo` must be **public** with the MIT license visible in About at submit time. Live URL: `https://paygo-jpwy.onrender.com`. Video: paste the YouTube link. Demo login: `lilbrown3000+paygo-test@gmail.com` / `test-password-123`.

## Inspiration

Deals are loud; prices are quiet. You find a product you like, buy it, and a month later it's $40 cheaper — or you keep refreshing retailer tabs hoping to catch a drop. We built PayGo so nobody ever overpays: search any product once, see the best live price across merchants, then let PayGo watch it and email you the moment the price actually drops.

## What it does

- **One search, every merchant.** Type a product name (or a vague request — agentic mode digs deeper) and PayGo returns live offers from across the web, sorted by real price with shipping and merchant context.
- **A verdict, not just results.** Each product page shows the current best offer, the full offer table, and a price history chart, so "wait or buy?" has an answer.
- **Watch and forget.** Add products to your watchlist. A scheduled job checks every watched product daily and records the price.
- **Alerts that respect your wallet.** When a price drops below the level you added it at (and then below each alert it sends), PayGo emails you the drop — product, old price → new price, and a link straight to the offer.
- **Freemium, powered by PayPal.** Free is genuinely useful: unlimited searches, up to three watched products, manual "Check now". Pro ($4.99/mo) removes the watchlist cap and turns on email alerts — a real PayPal subscription (sandbox for the demo, one config flag from live).

## How we built it

- **App:** TypeScript end to end — TanStack Start (React 19) with server functions, better-auth sessions, Drizzle + Postgres, Tailwind/shadcn UI.
- **Product data:** Channel3 for product search (text, semantic, and agentic), offers, price history, and recommendations — plus affiliate links so every purchase earns a commission.
- **Payments:** PayPal Subscriptions for Pro, with webhook-free confirmation (subscribe → confirm → sync) that survives refreshes and idempotent retries.
- **Everything else:** the alert pipeline runs on **Render Workflows** — a root task (`runPriceAlerts`) fans out one `checkProductAlerts` run per watched product with `Promise.allSettled`, so one flaky retailer never sinks the batch. A **Render cron job** triggers the pipeline daily; failures retry on the platform and roll up into per-run summaries.
- **Error handling:** every boundary (repo, Channel3, mail, PayPal, watchlist) returns typed `Result`s with tagged errors and user-facing message maps — no stray `throw`s in the happy path.

## Challenges we ran into

- **Alert dedup state machine** — first alert below the added-at baseline, then only below the last alerted price, with Pro gating that leaves alert state untouched for Free users so an upgrade still delivers the drop they missed. Getting this right took most of the design time — and it's fully unit-tested.
- **Workflows vs. the web app** — the runner had to work both inline (server function) and as a standalone task run, so we decoupled it from the app's client environment and made the per-product logic shared.
- **The environment gotcha** — cron runs built before we added its API key kept failing with "nothing dispatched"; the fix was learning that env vars only reach cron runs after a redeploy. The schedule is now verified end-to-end: cron → dispatch script → workflow fan-out → email.
- **CSRF behind a proxy** — a custom `src/start.ts` silently replaced TanStack Start's automatic CSRF middleware; we reinstated `createCsrfMiddleware` for server functions and verified real browser server-function calls still pass through Render's proxy.

## Accomplishments we're proud of

- A live, deployed product (not a local demo) with the full loop working: search → verdict → watch → drop detected → email delivered → upgrade delivered the missed alert.
- The daily pipeline runs unattended on Render Workflows + cron, with per-product fan-out and run summaries.
- 71 unit tests over the tricky parts (drop decisions, wire codecs, alert summaries, money formatting) and a clean type/lint gate.
- An error-handling architecture where every failure mode has a name, a message, and a test.

## What we learned

- Agentic search is a UX decision, not just an API mode — the switch between fast text search and slower agentic search changes what users type.
- Serverless workflows want their codebase boundary to be explicit: shared pure functions in, environment-specific wiring out.
- Freemium is a great forcing function for clean state transitions (who gets the email, when, and what happens on upgrade).

## What's next

- Real email sending domain + digest mode (daily/weekly rollups).
- Watchlist targets ("notify me only under $180") instead of baseline drops.
- Browser extension that watches the exact retailer page you're on.
- More merchants per product and price-prediction hints from history.

## Built with

`typescript` · `tanstack-start` · `react` · `drizzle-orm` · `postgresql` · `better-auth` · `tailwindcss` · `channel3` · `paypal-subscriptions` · `render` · `render-workflows` · `nitro`

## Links

- Live demo: https://paygo-jpwy.onrender.com — login `lilbrown3000+paygo-test@gmail.com` / `test-password-123`
- Code: https://github.com/VesperQuartz/paygo (MIT)
- Video: _paste YouTube link_

> Internal notes: sponsor boxes — PayPal (subscriptions + demo), Channel3 (search/offers/history/affiliate), Render (web + Postgres + Workflows + cron). Mention "worth $4.99/mo" and the affiliate model if the form asks about monetization.
