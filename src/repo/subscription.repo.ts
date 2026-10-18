import { Result } from "better-result";
import { desc, eq } from "drizzle-orm";

import { SubscriptionStorageError, type SubscriptionOperation } from "@/lib/subscription/errors";
import { db } from "@/lib/db";
import { subscription } from "./schema/subscription.schema";

type SubscriptionRow = typeof subscription.$inferSelect;

export interface SubscriptionRecord {
  id: string;
  userId: string;
  provider: string;
  externalId: string;
  planId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const toRecord = (row: SubscriptionRow): SubscriptionRecord => ({
  id: row.id,
  userId: row.userId,
  provider: row.provider,
  externalId: row.externalId,
  planId: row.planId,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Every subscription query goes through this seam: a rejected promise becomes
 * a tagged storage error and the underlying cause is logged once, server-side.
 */
const run = <TValue>(
  operation: SubscriptionOperation,
  call: () => Promise<TValue>,
): Promise<Result<TValue, SubscriptionStorageError>> =>
  Result.tryPromise({
    try: call,
    catch: (cause) => {
      console.error(`[subscription] ${operation} failed`, cause);
      return new SubscriptionStorageError({ operation, cause });
    },
  });

/**
 * Stores the latest known PayPal state of a subscription. Keyed by PayPal's
 * subscription id, so re-confirming or syncing the same subscription updates
 * the row instead of duplicating it.
 */
export const upsertSubscription = (input: {
  userId: string;
  externalId: string;
  planId: string;
  status: string;
}): Promise<Result<SubscriptionRecord, SubscriptionStorageError>> =>
  run("upsertSubscription", async () => {
    const now = new Date();
    const [row] = await db
      .insert(subscription)
      .values({
        userId: input.userId,
        provider: "paypal",
        externalId: input.externalId,
        planId: input.planId,
        status: input.status,
        lastSyncedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subscription.externalId,
        set: {
          userId: input.userId,
          planId: input.planId,
          status: input.status,
          lastSyncedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    if (!row) {
      throw new Error("subscription upsert returned no row");
    }

    return toRecord(row);
  });

/** The viewer's most recently created subscription row, whatever its status. */
export const getSubscriptionForUser = (
  userId: string,
): Promise<Result<SubscriptionRecord | null, SubscriptionStorageError>> =>
  run("getSubscriptionForUser", async () => {
    const rows = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    return rows[0] ? toRecord(rows[0]) : null;
  });
