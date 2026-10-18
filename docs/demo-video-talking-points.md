# PayGo — demo video talking points

Companion to `docs/demo-video-script.md` (which has the full shot list and setup checklist). These are the beats to speak from — don't read them verbatim, just hit the ideas.

**The one-liner** (open and close with it): _"PayGo is a shopping assistant that finds the best live price and watches it for you — so you never overpay."_

## Beat 1 — Hook (home page)

- "Prices change constantly — the deal you found last week usually isn't the best price today."
- "Instead of refreshing retailer tabs, I search once, and PayGo keeps watch."

## Beat 2 — Search (search page)

- "One search across every merchant — powered by Channel3's product catalog."
- "Live offers, sorted by real price — [point at the spread, e.g. $190 vs $250]."
- Deep search toggle if there's time: "It kicks in an AI agent for vague requests like 'good noise-cancelling headphones for flights'."

## Beat 3 — Verdict (product page)

- "It's not just results — it's a verdict: best current offer, the full offer table, and the price history."
- "So 'wait or buy?' has an actual answer."

## Beat 4 — Watch + the pipeline (watchlist → Render dashboard)

- "I add it to my watchlist. Free covers three products with manual checks."
- Cut to Render: "Every day a cron job fires and starts a Render Workflow that fans out one check per watched product."
- "One flaky retailer can't sink the batch — each product is its own run with retries."

## Beat 5 — Drop → upgrade → email (the money moment)

- Click Check now (free): "It caught a drop — but email alerts are a Pro feature."
- "/pro is a real PayPal subscription — $4.99 a month, sandbox today, one config flag from live."
- After upgrade: "Here's the detail I'm proudest of: because it detected the drop while I was on Free, upgrading still delivered it — no missed alert."
- Show Gmail: "There it is — old price, new price, and a link straight to the offer."

## Beat 6 — Close

- "PayGo: TanStack Start on Render, Render Workflows for the daily checks, Channel3 for product data, PayPal for Pro."
- Repeat the one-liner, URL on screen: `paygo-jpwy.onrender.com`.

## Filler phrases that land

- "Loud deals, quiet prices."
- "Alerts that respect your wallet — no spam, one email per real drop."
- "Free is genuinely useful. Pro is unlimited watchlist + emails."

## Delivery notes

- Target 2:15–2:45; pause a beat on the email reveal — that's the money shot.
- Don't narrate every click; say _why_ you're clicking, not what.
- Human words: "check now" — not "I'll trigger the alert function".

## Before recording

- Stage the drop: baseline must be above the live price ($259.99 works for the AirPods Pro 3 demo item).
- Restore after: baseline back to $199.99.
- Demo login: `lilbrown3000+paygo-test@gmail.com` / `test-password-123`.
