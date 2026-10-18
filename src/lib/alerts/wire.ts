import { Result } from "better-result";
import z from "zod";

import { watchlistErrorFromWire, watchlistErrorToWire } from "@/lib/watchlist/wire";

/** Outcome counters from one price-alert run, as the UI consumes them. */
export interface AlertsRunSummary {
  /** Distinct products the run asked Channel3 about. */
  productsChecked: number;
  /** Products whose live price could not be fetched. */
  productsFailed: number;
  /** Watchlist rows evaluated against a live price. */
  itemsChecked: number;
  /** Drop emails delivered (SMTP accepted). */
  alertsSent: number;
  /** Items with a detected drop whose email (or alert record) failed. */
  alertsFailed: number;
  /** Detected drops left unemailed because the owner isn't on Pro. */
  proRequired: number;
  /** Evaluated items with no drop (the quiet majority). */
  skipped: number;
}

/** Field-wise sum of per-product summaries, e.g. when a run fans out over products. */
export const mergeAlertsSummaries = (
  summaries: ReadonlyArray<AlertsRunSummary>,
): AlertsRunSummary =>
  summaries.reduce<AlertsRunSummary>(
    (total, summary) => ({
      productsChecked: total.productsChecked + summary.productsChecked,
      productsFailed: total.productsFailed + summary.productsFailed,
      itemsChecked: total.itemsChecked + summary.itemsChecked,
      alertsSent: total.alertsSent + summary.alertsSent,
      alertsFailed: total.alertsFailed + summary.alertsFailed,
      proRequired: total.proRequired + summary.proRequired,
      skipped: total.skipped + summary.skipped,
    }),
    {
      productsChecked: 0,
      productsFailed: 0,
      itemsChecked: 0,
      alertsSent: 0,
      alertsFailed: 0,
      proRequired: 0,
      skipped: 0,
    },
  );

const summaryToWire = z.object({
  productsChecked: z.number().int().nonnegative(),
  productsFailed: z.number().int().nonnegative(),
  itemsChecked: z.number().int().nonnegative(),
  alertsSent: z.number().int().nonnegative(),
  alertsFailed: z.number().int().nonnegative(),
  proRequired: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

const summaryFromWire = summaryToWire;

// Shares the watchlist error contract: an alert run only fails on session or
// storage problems, both of which the watchlist codec already models.
export const alertsRunCodec = Result.codec({
  serialize: { ok: summaryToWire, err: watchlistErrorToWire },
  deserialize: { ok: summaryFromWire, err: watchlistErrorFromWire },
});
