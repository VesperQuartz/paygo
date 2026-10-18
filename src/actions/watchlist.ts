import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
import z from "zod";
import { sessionUserId } from "@/lib/auth-session";
import { FREE_WATCHLIST_LIMIT } from "@/lib/subscription/plan";
import { WatchlistLimitReached } from "@/lib/watchlist/errors";
import {
  watchlistEntryCodec,
  watchlistListCodec,
  watchlistRemovalCodec,
  watchlistStateCodec,
  type WatchlistState,
} from "@/lib/watchlist/wire";
import {
  addWatchlistItem as addWatchlistItemRecord,
  isProductWatched,
  isWatchlistAtLimit,
  listWatchlist as listWatchlistRecords,
  removeWatchlistItem as removeWatchlistItemRecord,
} from "@/repo/watchlist.repo";

const productIdInputSchema = z.object({
  productId: z.string().min(1),
});

/**
 * Whether the current viewer is signed in and already watches this product —
 * feeds the PDP's watch button without an extra round trip.
 */
export const getWatchlistState = createServerFn({ method: "POST" })
  .validator(productIdInputSchema)
  .handler(async ({ data }) => {
    const session = await sessionUserId("isProductWatched");
    const result = await session.andThenAsync(async (userId) => {
      const watched = await isProductWatched(userId, data.productId);
      return watched.map((value): WatchlistState => ({ signedIn: true, watched: value }));
    });

    return await watchlistStateCodec.serializeUnsafe(result);
  });

const addInputSchema = productIdInputSchema.extend({
  title: z.string().min(1).max(500),
  brand: z.string().max(200).nullish(),
  imageUrl: z.string().max(2000).nullish(),
  priceAmount: z.number().nonnegative().nullish(),
  priceCurrency: z.string().max(10).nullish(),
});

/**
 * Adds (or refreshes) a watched product and returns the stored snapshot.
 * Free-tier accounts are capped; the cap check treats re-adding an existing
 * product as an allowed refresh, so the button stays idempotent.
 */
export const addWatchlistItem = createServerFn({ method: "POST" })
  .validator(addInputSchema)
  .handler(async ({ data }) => {
    const session = await sessionUserId("addWatchlistItem");
    const result = await session.andThenAsync(async (userId) => {
      const atLimit = await isWatchlistAtLimit(userId, data.productId);
      if (atLimit.status === "error") {
        return Result.err(atLimit.error);
      }
      if (atLimit.value) {
        return Result.err(new WatchlistLimitReached({ limit: FREE_WATCHLIST_LIMIT }));
      }

      return addWatchlistItemRecord({
        userId,
        productId: data.productId,
        title: data.title,
        brand: data.brand ?? null,
        imageUrl: data.imageUrl ?? null,
        priceAmount: data.priceAmount ?? null,
        priceCurrency: data.priceCurrency ?? null,
      });
    });

    return await watchlistEntryCodec.serializeUnsafe(result);
  });

/** Removes a watched product. Unauthenticated callers get a sign-in error. */
export const removeWatchlistItem = createServerFn({ method: "POST" })
  .validator(productIdInputSchema)
  .handler(async ({ data }) => {
    const session = await sessionUserId("removeWatchlistItem");
    const result = await session.andThenAsync((userId) =>
      removeWatchlistItemRecord(userId, data.productId),
    );

    return await watchlistRemovalCodec.serializeUnsafe(result);
  });

/** The signed-in viewer's watchlist, newest first. */
export const listWatchlist = createServerFn({ method: "POST" }).handler(async () => {
  const session = await sessionUserId("listWatchlist");
  const result = await session.andThenAsync((userId) => listWatchlistRecords(userId));

  return await watchlistListCodec.serializeUnsafe(result);
});
