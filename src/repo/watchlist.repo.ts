import { Result } from "better-result";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { FREE_WATCHLIST_LIMIT } from "@/lib/subscription/plan";
import { ACTIVE_SUBSCRIPTION_STATUS } from "@/lib/subscription/status";
import { WatchlistStorageError, type WatchlistOperation } from "@/lib/watchlist/errors";
import type { WatchlistEntry } from "@/lib/watchlist/wire";
import { db } from "@/lib/db";
import { user } from "./schema/auth.schema";
import { subscription } from "./schema/subscription.schema";
import { watchlistItem } from "./schema/watchlist.schema";

type WatchlistItemRow = typeof watchlistItem.$inferSelect;

const toEntry = (row: WatchlistItemRow): WatchlistEntry => ({
  id: row.id,
  productId: row.productId,
  title: row.title,
  brand: row.brand,
  imageUrl: row.imageUrl,
  priceAmount: row.priceAmount,
  priceCurrency: row.priceCurrency,
  addedAt: row.addedAt,
});

/**
 * Every watchlist query goes through this seam: a rejected promise becomes a
 * tagged storage error and the underlying cause is logged once, server-side.
 */
const run = <TValue>(
  operation: WatchlistOperation,
  call: () => Promise<TValue>,
): Promise<Result<TValue, WatchlistStorageError>> =>
  Result.tryPromise({
    try: call,
    catch: (cause) => {
      console.error(`[watchlist] ${operation} failed`, cause);
      return new WatchlistStorageError({ operation, cause });
    },
  });

export const listWatchlist = (
  userId: string,
): Promise<Result<WatchlistEntry[], WatchlistStorageError>> =>
  run("listWatchlist", async () => {
    const rows = await db
      .select()
      .from(watchlistItem)
      .where(eq(watchlistItem.userId, userId))
      .orderBy(desc(watchlistItem.addedAt));

    return rows.map(toEntry);
  });

export interface AddWatchlistItemInput {
  userId: string;
  productId: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
}

/**
 * Idempotent by design: re-adding an already-watched product refreshes the
 * snapshot (title, price, image) instead of erroring, so the button needs no
 * separate "already watching" branch.
 */
export const addWatchlistItem = (
  input: AddWatchlistItemInput,
): Promise<Result<WatchlistEntry, WatchlistStorageError>> =>
  run("addWatchlistItem", async () => {
    const [row] = await db
      .insert(watchlistItem)
      .values({
        userId: input.userId,
        productId: input.productId,
        title: input.title,
        brand: input.brand,
        imageUrl: input.imageUrl,
        priceAmount: input.priceAmount,
        priceCurrency: input.priceCurrency,
      })
      .onConflictDoUpdate({
        target: [watchlistItem.userId, watchlistItem.productId],
        set: {
          title: input.title,
          brand: input.brand,
          imageUrl: input.imageUrl,
          priceAmount: input.priceAmount,
          priceCurrency: input.priceCurrency,
        },
      })
      .returning();

    if (!row) {
      throw new Error("watchlist upsert returned no row");
    }

    return toEntry(row);
  });

/** Removes a product from the watchlist. Removing what isn't there is a no-op. */
export const removeWatchlistItem = (
  userId: string,
  productId: string,
): Promise<Result<null, WatchlistStorageError>> =>
  run("removeWatchlistItem", async () => {
    await db
      .delete(watchlistItem)
      .where(and(eq(watchlistItem.userId, userId), eq(watchlistItem.productId, productId)));

    return null;
  });

export const isProductWatched = (
  userId: string,
  productId: string,
): Promise<Result<boolean, WatchlistStorageError>> =>
  run("isProductWatched", async () => {
    const rows = await db
      .select({ id: watchlistItem.id })
      .from(watchlistItem)
      .where(and(eq(watchlistItem.userId, userId), eq(watchlistItem.productId, productId)))
      .limit(1);

    return rows.length > 0;
  });

/**
 * Whether adding this product would exceed the free-tier watchlist cap.
 * Re-adding an already-watched product only refreshes it, so it never counts
 * as new; accounts with an active subscription have no cap.
 */
export const isWatchlistAtLimit = (
  userId: string,
  productId: string,
): Promise<Result<boolean, WatchlistStorageError>> =>
  run("isWatchlistAtLimit", async () => {
    const [existing, pro] = await Promise.all([
      db
        .select({ id: watchlistItem.id })
        .from(watchlistItem)
        .where(and(eq(watchlistItem.userId, userId), eq(watchlistItem.productId, productId)))
        .limit(1),
      db
        .select({ id: subscription.id })
        .from(subscription)
        .where(
          and(eq(subscription.userId, userId), eq(subscription.status, ACTIVE_SUBSCRIPTION_STATUS)),
        )
        .limit(1),
    ]);

    if (existing.length > 0 || pro.length > 0) {
      return false;
    }

    const [counted] = await db
      .select({ value: count() })
      .from(watchlistItem)
      .where(eq(watchlistItem.userId, userId));

    return (counted?.value ?? 0) >= FREE_WATCHLIST_LIMIT;
  });

/** A watchlist row enriched for the alert job: owner email, tier, last alerted price. */
export interface WatchlistAlertItem extends WatchlistEntry {
  email: string;
  /** Whether the owner has an active subscription (unlocks email alerts). */
  isPro: boolean;
  lastAlertedPriceAmount: number | null;
}

/**
 * Alert candidates for a price check — every user's rows, narrowed by `userId`
 * and/or `productId` when given. Joins the owner (email + active subscription)
 * so the job can decide delivery without further lookups.
 */
export const listWatchlistItemsForAlerts = (
  scope: { userId?: string; productId?: string } = {},
): Promise<Result<WatchlistAlertItem[], WatchlistStorageError>> =>
  run("listWatchlistForAlerts", async () => {
    const rows = await db
      .select({ item: watchlistItem, email: user.email, proSubscriptionId: subscription.id })
      .from(watchlistItem)
      .innerJoin(user, eq(watchlistItem.userId, user.id))
      .leftJoin(
        subscription,
        and(eq(subscription.userId, user.id), eq(subscription.status, ACTIVE_SUBSCRIPTION_STATUS)),
      )
      .where(
        and(
          scope.userId ? eq(watchlistItem.userId, scope.userId) : undefined,
          scope.productId ? eq(watchlistItem.productId, scope.productId) : undefined,
        ),
      )
      .orderBy(asc(watchlistItem.productId));

    return rows.map(({ item, email, proSubscriptionId }) => ({
      ...toEntry(item),
      email,
      isPro: proSubscriptionId != null,
      lastAlertedPriceAmount: item.lastAlertedPriceAmount,
    }));
  });

/**
 * Distinct products watched by anyone, or by one user — the unit the alert
 * workflow fans out one task run per product.
 */
export const listWatchedProductIds = (
  scope: { userId?: string } = {},
): Promise<Result<string[], WatchlistStorageError>> =>
  run("listWatchedProductIds", async () => {
    const rows = await db
      .selectDistinct({ productId: watchlistItem.productId })
      .from(watchlistItem)
      .where(scope.userId ? eq(watchlistItem.userId, scope.userId) : undefined)
      .orderBy(asc(watchlistItem.productId));

    return rows.map((row) => row.productId);
  });

/** Records that the alert job looked at this item, drop or not. */
export const markWatchlistItemChecked = (
  id: string,
  at: Date,
): Promise<Result<null, WatchlistStorageError>> =>
  run("markWatchlistItemChecked", async () => {
    await db.update(watchlistItem).set({ lastCheckedAt: at }).where(eq(watchlistItem.id, id));

    return null;
  });

/** Records a sent alert so the next email for this item requires a further drop. */
export const markWatchlistItemAlerted = (
  id: string,
  args: { priceAmount: number; at: Date },
): Promise<Result<null, WatchlistStorageError>> =>
  run("markWatchlistItemAlerted", async () => {
    await db
      .update(watchlistItem)
      .set({
        lastAlertedAt: args.at,
        lastAlertedPriceAmount: args.priceAmount,
        lastCheckedAt: args.at,
      })
      .where(eq(watchlistItem.id, id));

    return null;
  });
