import type { ProductOffer } from "@channel3/sdk/resources";
import { Result } from "better-result";
import { serverEnv } from "@/env/server";
import { getChannel3 } from "@/lib/channel3";
import { leadOffer } from "@/lib/format";
import { transporter } from "@/lib/mail";
import type { WatchlistStorageError } from "@/lib/watchlist/errors";
import {
  listWatchlistItemsForAlerts,
  markWatchlistItemAlerted,
  markWatchlistItemChecked,
  type WatchlistAlertItem,
} from "@/repo/watchlist.repo";
import { MailServer } from "@/services/mail";
import { shouldAlertOnDrop } from "./drop";
import { mergeAlertsSummaries, type AlertsRunSummary } from "./wire";

const mailServer = new MailServer(transporter);

/** Absolute product links inside alert emails; every deployment sets this. */
const baseUrl = serverEnv.VITE_BASE_URL ?? "http://localhost:3000";

/** Cheapest in-stock offer, matching what the PDP presents as the lead price. */
const cheapestPrice = (offers: ReadonlyArray<ProductOffer> | undefined) => {
  const offer = leadOffer(offers);
  return offer ? offer.price : null;
};

const emptySummary = (): AlertsRunSummary => ({
  productsChecked: 0,
  productsFailed: 0,
  itemsChecked: 0,
  alertsSent: 0,
  alertsFailed: 0,
  proRequired: 0,
  skipped: 0,
});

/**
 * One product's watched rows against its live price: record the outcome and
 * email owners whose baseline was beaten — Pro owners only; drops found for
 * free-tier owners are counted (`proRequired`) and left unemailed so an upgrade
 * can still deliver them. Never throws: fetch, email, and mark failures are
 * counted so a single bad product can't kill the run.
 */
const alertOnProduct = async (
  productId: string,
  items: WatchlistAlertItem[],
  now: Date,
): Promise<AlertsRunSummary> => {
  const summary = { ...emptySummary(), productsChecked: 1 };

  const fetched = await Result.tryPromise({
    try: () => getChannel3().products.retrieve({ product_id: productId }),
    catch: (cause) => {
      console.error(`[alerts] price fetch failed for product ${productId}`, cause);
      return cause;
    },
  });

  if (fetched.status === "error") {
    summary.productsFailed = 1;
    return summary;
  }

  const price = cheapestPrice(fetched.value.offers);
  summary.itemsChecked = items.length;

  for (const item of items) {
    if (
      price == null ||
      item.priceAmount == null ||
      item.priceCurrency == null ||
      price.currency !== item.priceCurrency
    ) {
      await markWatchlistItemChecked(item.id, now);
      continue;
    }

    const dropping = shouldAlertOnDrop({
      currentPrice: price.price,
      baselinePrice: item.priceAmount,
      lastAlertedPrice: item.lastAlertedPriceAmount,
    });

    if (!dropping) {
      await markWatchlistItemChecked(item.id, now);
      continue;
    }

    if (!item.isPro) {
      // Drop detected, but email alerts are a Pro feature. Alert state stays
      // untouched so a later upgrade can still deliver this drop.
      summary.proRequired += 1;
      await markWatchlistItemChecked(item.id, now);
      continue;
    }

    const sent = await mailServer.sendPriceDropAlert({
      recipient: item.email,
      productTitle: item.title,
      imageUrl: item.imageUrl,
      productUrl: `${baseUrl}/product/${item.productId}`,
      previousPrice: item.lastAlertedPriceAmount ?? item.priceAmount,
      currentPrice: price.price,
      currency: price.currency,
    });

    if (sent.status === "error") {
      // Alert state left untouched: the next run retries this email.
      summary.alertsFailed += 1;
      await markWatchlistItemChecked(item.id, now);
      continue;
    }

    summary.alertsSent += 1;
    const marked = await markWatchlistItemAlerted(item.id, {
      priceAmount: price.price,
      at: now,
    });
    if (marked.status === "error") {
      // The email did go out; the record failed, so a later run may re-send.
      summary.alertsFailed += 1;
    }
  }

  summary.skipped =
    summary.itemsChecked - summary.alertsSent - summary.alertsFailed - summary.proRequired;
  return summary;
};

/**
 * Everything watched for a single product (every user), as one summary — the
 * unit of work the Render Workflow fans out over. Storage failures are the
 * caller's to retry: they surface as `Result.err`.
 */
export const runProductAlerts = async (
  productId: string,
): Promise<Result<AlertsRunSummary, WatchlistStorageError>> => {
  const listed = await listWatchlistItemsForAlerts({ productId });
  if (listed.status === "error") {
    return Result.err(listed.error);
  }

  return Result.ok(await alertOnProduct(productId, listed.value, new Date()));
};

/**
 * One inline pass of the price-alert job (the "Check now" button and the
 * secret-guarded alerts route): list once, group by product, then walk the
 * groups. Per-item and per-product failures are counted, never fatal — a run
 * only fails when the watchlist itself can't be read.
 *
 * `userId` scopes the run to one user; omit it for the whole table.
 */
export const runPriceAlerts = async ({
  userId,
}: {
  userId?: string;
} = {}): Promise<Result<AlertsRunSummary, WatchlistStorageError>> => {
  const listed = await listWatchlistItemsForAlerts({ userId });
  if (listed.status === "error") {
    return Result.err(listed.error);
  }

  const byProduct = new Map<string, WatchlistAlertItem[]>();
  for (const item of listed.value) {
    const group = byProduct.get(item.productId);
    if (group) {
      group.push(item);
    } else {
      byProduct.set(item.productId, [item]);
    }
  }

  const now = new Date();
  const summaries: AlertsRunSummary[] = [];
  for (const [productId, items] of byProduct) {
    summaries.push(await alertOnProduct(productId, items, now));
  }

  return Result.ok(mergeAlertsSummaries(summaries));
};
