# PayGo — demo video script (< 3 min)

Target length: ~2:40. Record at 1080p (browser window ~1280×800), clean profile (no extra tabs/bookmarks), hide the bookmarks bar.

## Pre-recording checklist

- [ ] Demo user: `lilbrown3000+paygo-test@gmail.com` / `test-password-123` — free tier, one watchlist item (AirPods Pro 3, `c6bFoi2`).
- [ ] Check the item is still **free tier** and `last_alerted_price_amount` is NULL (if a scheduled run already emailed, either use another product or bump the baseline again).
- [ ] **Stage a drop**: raise the watchlist baseline so the next check detects a drop:
      `UPDATE watchlist_item SET added_price_amount = 259.99, last_alerted_price_amount = NULL, last_alerted_at = NULL WHERE product_id = 'c6bFoi2';`
- [ ] Restore baseline to `199.99` after recording.
- [ ] Tabs ready (in this order): PayGo home · Gmail (inbox of the demo alias) · Render dashboard (workflow **paygo-alerts** runs + cron **paygo-alerts-daily**).
- [ ] PayPal sandbox buyer approval works (or pre-seed an ACTIVE subscription if the sandbox approval click is flaky on camera — the video can still show the real Subscribe button and modal).
- [ ] Mic check + close Slack/notifications.

## Scenes

**0:00–0:15 — Hook (home page)**

> "Prices change constantly, and the deal you found last week is often not the best price today. PayGo is a shopping assistant that finds the best live offer and then keeps watching, so you never overpay."

Show the home page, type in the search bar (or just show hero) — keep it moving.

**0:15–0:50 — Search + verdict (Channel3)**

- Search `airpods pro 3` (or `airpods`).
- Point out: live offers from many merchants, sorted by price — e.g. $190.08 / $199.99 / $218.48 / $249.99.
- Open the AirPods Pro 3 product page; show the best-price verdict, offers table, and price history chart.

> "One search, every merchant. PayGo's agentic search runs on Channel3's product catalog — and the verdict tells you if now is a good time to buy."

**0:50–1:20 — Watch it (free tier)**

- Sign in as the demo user (or show signed-in state).
- Click **Watch price** → open **Watchlist**.

> "Add a product and PayGo tracks it. Our daily alert job runs on Render Workflows — a root task fans out one product check per watched item."

- Briefly show the Render dashboard: workflow **paygo-alerts** → recent `runPriceAlerts` runs with `checkProductAlerts` children, and the cron job **paygo-alerts-daily** (9am ET daily).

> "Free covers three watched products with manual checks. Pro is unlimited, with email alerts."

**1:20–2:10 — Drop → upgrade → real email (PayPal)**

- Back on the Watchlist, click **Check now** (still free) → toast: drop found, but email alerts are part of Pro.

> "It caught a drop — but the inbox digest is a Pro feature."

- Go to **/pro** → **Subscribe** → PayPal sandbox subscription modal ($4.99/mo) → approve → back on `/pro` showing **You're on Pro**.

> "Pro is a real PayPal subscription — sandbox today, one line to go live."

- Watchlist → **Check now** again → toast confirms the email.
- Cut to Gmail: show the **price-drop email** (product, old price → new price, button to the product page).

> "And because the drop was detected while on Free, upgrading still delivered it."

**2:10–2:40 — Under the hood + close**

- Quick cuts on the Render dashboard (workflow runs, cron run history), maybe the terminal-style shot is optional.

> "PayGo is TanStack Start on Render, with Render Workflows fanning out the daily price checks, Channel3 for product data, and PayPal for Pro. Search any product — never overpay."

- End on the home page / logos. Title card: `paygo-jpwy.onrender.com`.

## After recording

- Restore baseline: `UPDATE watchlist_item SET added_price_amount = 199.99 WHERE product_id = 'c6bFoi2';`
- Neutralize demo state for judges: keep free tier + 1 watched item (recommended), or leave Pro active + keep the email visible (either is fine — free tier shows the freemium story better).
- Export < 3:00, upload to YouTube (unlisted is fine for Devpost), keep 1080p.
