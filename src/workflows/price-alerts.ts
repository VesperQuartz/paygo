import { task, type TaskContext } from "@renderinc/sdk/workflows";

import { runProductAlerts } from "@/lib/alerts/runner";
import { mergeAlertsSummaries, type AlertsRunSummary } from "@/lib/alerts/wire";
import { listWatchedProductIds } from "@/repo/watchlist.repo";

/**
 * One watched product per run: fetch its live price, alert Pro owners whose
 * baseline was beaten, and return that product's counters. Storage failures
 * throw so Render retries the run; everything else is counted inside.
 */
export const checkProductAlerts = task(
  { name: "checkProductAlerts" },
  async (_ctx: TaskContext, productId: string): Promise<AlertsRunSummary> => {
    const result = await runProductAlerts(productId);
    if (result.status === "error") {
      throw result.error;
    }
    return result.value;
  },
);

/**
 * Root task of the daily price check: fan out one `checkProductAlerts` run per
 * watched product (each on its own instance, in parallel), then merge their
 * summaries. A product whose run still fails after platform retries is counted
 * in `productsFailed`, not fatal to the rest.
 */
export const runPriceAlerts = task(
  { name: "runPriceAlerts" },
  async (ctx: TaskContext): Promise<AlertsRunSummary> => {
    const productIds = await listWatchedProductIds();
    if (productIds.status === "error") {
      throw productIds.error;
    }

    const settled = await Promise.allSettled(
      productIds.value.map((productId) => ctx.run(checkProductAlerts, productId)),
    );

    const summaries: AlertsRunSummary[] = [];
    let productsFailed = 0;

    settled.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") {
        summaries.push(outcome.value);
      } else {
        productsFailed += 1;
        console.error(`[alerts] product ${productIds.value[index]} failed`, outcome.reason);
      }
    });

    const merged = mergeAlertsSummaries(summaries);
    return {
      ...merged,
      productsChecked: productIds.value.length,
      productsFailed: merged.productsFailed + productsFailed,
    };
  },
);
