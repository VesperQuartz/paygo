import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

/**
 * A PayPal subscription owned by a user. `externalId` is PayPal's subscription
 * id; `status` mirrors PayPal's status strings (ACTIVE, APPROVAL_PENDING,
 * CANCELLED, SUSPENDED, EXPIRED). Only ACTIVE rows unlock Pro features.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("paypal"),
    externalId: text("external_id").notNull(),
    planId: text("plan_id").notNull(),
    status: text("status").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("subscription_external_id_uidx").on(table.externalId),
    index("subscription_user_idx").on(table.userId),
  ],
);
