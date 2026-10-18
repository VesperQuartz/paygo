import type { ProductOffer } from "@channel3/sdk/resources";
import { Result } from "better-result";
import { clientEnv } from "@/env/client";
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
import type { AlertsRunSummary } from "./wire";

const mailServer = new MailServer(transporter);

/** Cheapest in-stock offer, matching what the PDP presents as the lead price. */
const cheapestPrice = (offers: ReadonlyArray<ProductOffer> | undefined) => {
  const offer = leadOffer(offers);
  return offer ? offer.price : null;
};

/**
 * One pass of the price-alert job: fetch each watched product's live price,
 * record the outcome, and email owners whose baseline was beaten — Pro owners
 * only; drops found for free-tier owners are counted (`proRequired`) and left
 * unemailed so an upgrade can still deliver them. Per-item failures (fetch,
 * email, mark) are counted, never fatal — a run only fails when the watchlist
 * itself can't be read.
 *
 * `userId` scopes the run to one user (the "Check now" button); omit it for
 * the scheduled whole-table run behind the alerts route.
 */
export const runPriceAlerts = async ({ userId }: { userId?: string } = {}): Promise<
  Result<AlertsRunSummary, WatchlistStorageError>
> => {
  const listed = await listWatchlistItemsForAlerts(userId);
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

  const client = getChannel3();
  const now = new Date();

  let productsChecked = 0;
  let productsFailed = 0;
  let itemsChecked = 0;
  let alertsSent = 0;
  let alertsFailed = 0;
  let proRequired = 0;

  for (const [productId, items] of byProduct) {
    productsChecked += 1;

    const fetched = await Result.tryPromise({
      try: () => client.products.retrieve({ product_id: productId }),
      catch: (cause) => {
        console.error(`[alerts] price fetch failed for product ${productId}`, cause);
        return cause;
      },
    });

    if (fetched.status === "error") {
      productsFailed += 1;
      continue;
    }

    const price = cheapestPrice(fetched.value.offers);
    itemsChecked += items.length;

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
        proRequired += 1;
        await markWatchlistItemChecked(item.id, now);
        continue;
      }

      const sent = await mailServer.sendPriceDropAlert({
        recipient: item.email,
        productTitle: item.title,
        imageUrl: item.imageUrl,
        productUrl: `${clientEnv.VITE_BASE_URL}/product/${item.productId}`,
        previousPrice: item.lastAlertedPriceAmount ?? item.priceAmount,
        currentPrice: price.price,
        currency: price.currency,
      });

      if (sent.status === "error") {
        // Alert state left untouched: the next run retries this email.
        alertsFailed += 1;
        await markWatchlistItemChecked(item.id, now);
        continue;
      }

      alertsSent += 1;
      const marked = await markWatchlistItemAlerted(item.id, {
        priceAmount: price.price,
        at: now,
      });
      if (marked.status === "error") {
        // The email did go out; the record failed, so a later run may re-send.
        alertsFailed += 1;
      }
    }
  }

  return Result.ok({
    productsChecked,
    productsFailed,
    itemsChecked,
    alertsSent,
    alertsFailed,
    proRequired,
    skipped: itemsChecked - alertsSent - alertsFailed - proRequired,
  });
};
