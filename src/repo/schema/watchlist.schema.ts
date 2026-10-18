import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

/**
 * A product a shopper asked PayGo to watch for price drops. Snapshot columns
 * (title, brand, image, last-seen price) let the watchlist render without
 * re-querying Channel3; the alert job re-checks live prices against these rows.
 */
export const watchlistItem = pgTable(
  "watchlist_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    title: text("title").notNull(),
    brand: text("brand"),
    imageUrl: text("image_url"),
    priceAmount: doublePrecision("price_amount"),
    priceCurrency: text("price_currency"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
    /** Last time the alert job looked up this item's live price. */
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    /** Last time a drop alert email went out for this item. */
    lastAlertedAt: timestamp("last_alerted_at", { withTimezone: true }),
    /** Price at that last alert — the floor for sending another one. */
    lastAlertedPriceAmount: doublePrecision("last_alerted_price_amount"),
  },
  (table) => [
    uniqueIndex("watchlist_item_user_product_uidx").on(table.userId, table.productId),
    index("watchlist_item_user_idx").on(table.userId),
  ],
);
