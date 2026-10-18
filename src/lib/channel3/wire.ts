import type {
  PriceHistoryPoint,
  PriceHistoryResponse,
  PriceStatistics,
  PriceStatus,
  Product,
} from "@channel3/sdk/resources";
import { Result, UnhandledException } from "better-result";
import z from "zod";

import {
  CHANNEL3_OPERATIONS,
  Channel3RequestRejected,
  Channel3Unavailable,
  ProductNotFound,
  type Channel3Error,
} from "./errors";

/** A page of products returned by search and recommendations. */
export interface Channel3ProductPage {
  products: Product[];
  nextPageToken: string | null;
}

/** Price history with real Dates and a non-optional statistics slot. */
export type Channel3PriceHistory = Omit<PriceHistoryResponse, "history" | "statistics"> & {
  history: PriceHistoryPoint[];
  statistics: PriceStatistics | null;
};

const PRICE_STATUSES = ["low", "typical", "high"] as const satisfies readonly PriceStatus[];

/**
 * Minimal structural check for vendor-owned payloads. Channel3's SDK owns the
 * full Product contract; this validates the shape the UI relies on (an object
 * with a string id) and hands everything else through untouched.
 */
const isProductShaped = (value: unknown): value is Product =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

// --- Ok payloads ---

const productPageToWire = z.object({
  products: z.array(z.custom<Product>(isProductShaped)),
  nextPageToken: z.string().nullable(),
});

const productPageFromWire = productPageToWire;

const productToWire = z.custom<Product>(isProductShaped);

const productFromWire = productToWire;

const pricePointToWire = z.object({
  timestamp: z.date().transform((value) => value.toISOString()),
  price: z.number(),
  currency: z.string(),
});

const pricePointFromWire = z.object({
  timestamp: z.coerce.date(),
  price: z.number(),
  currency: z.string(),
});

const priceStatisticsToWire = z.object({
  mean: z.number(),
  std_dev: z.number(),
  min_price: z.number(),
  max_price: z.number(),
  current_price: z.number(),
  current_status: z.enum(PRICE_STATUSES),
  currency: z.string(),
});

const priceStatisticsFromWire = priceStatisticsToWire;

const priceHistoryToWire = z.object({
  canonical_product_id: z.string(),
  product_title: z.string().nullable().optional(),
  history: z.array(pricePointToWire),
  statistics: priceStatisticsToWire.nullable(),
});

const priceHistoryFromWire = z.object({
  canonical_product_id: z.string(),
  product_title: z.string().nullable().optional(),
  history: z.array(pricePointFromWire),
  statistics: priceStatisticsFromWire.nullable(),
});

// --- Error payloads ---
// Wire errors expose only stable codes and safe fields: no message (the
// constructors recompute it), no cause (it may hold raw upstream responses or
// credentials), and no stack.

const channel3ErrorToWire = z.discriminatedUnion("_tag", [
  z.object({
    _tag: z.literal("Channel3Unavailable"),
    operation: z.enum(CHANNEL3_OPERATIONS),
    statusCode: z.number().nullable(),
  }),
  z.object({
    _tag: z.literal("Channel3RequestRejected"),
    operation: z.enum(CHANNEL3_OPERATIONS),
    statusCode: z.number(),
  }),
  z.object({
    _tag: z.literal("ProductNotFound"),
    productId: z.string(),
  }),
  z.object({
    _tag: z.literal("UnhandledException"),
  }),
]);

const channel3ErrorFromWire = z.discriminatedUnion("_tag", [
  z
    .object({
      _tag: z.literal("Channel3Unavailable"),
      operation: z.enum(CHANNEL3_OPERATIONS),
      statusCode: z.number().nullable(),
    })
    .transform(
      (wire) => new Channel3Unavailable({ operation: wire.operation, statusCode: wire.statusCode }),
    ),
  z
    .object({
      _tag: z.literal("Channel3RequestRejected"),
      operation: z.enum(CHANNEL3_OPERATIONS),
      statusCode: z.number(),
    })
    .transform(
      (wire) =>
        new Channel3RequestRejected({ operation: wire.operation, statusCode: wire.statusCode }),
    ),
  z
    .object({
      _tag: z.literal("ProductNotFound"),
      productId: z.string(),
    })
    .transform((wire) => new ProductNotFound({ productId: wire.productId })),
  z
    .object({
      _tag: z.literal("UnhandledException"),
    })
    .transform(() => new UnhandledException({ cause: undefined })),
]);

// --- Boundary codecs (see docs/better-result-adoption.md, section 6) ---

export const channel3ProductPageCodec = Result.codec({
  serialize: { ok: productPageToWire, err: channel3ErrorToWire },
  deserialize: { ok: productPageFromWire, err: channel3ErrorFromWire },
});

export const channel3ProductCodec = Result.codec({
  serialize: { ok: productToWire, err: channel3ErrorToWire },
  deserialize: { ok: productFromWire, err: channel3ErrorFromWire },
});

export const channel3PriceHistoryCodec = Result.codec({
  serialize: { ok: priceHistoryToWire, err: channel3ErrorToWire },
  deserialize: { ok: priceHistoryFromWire, err: channel3ErrorFromWire },
});

/**
 * Explicit seam for consumers that only understand thrown errors (TanStack
 * Query error states and vendored Promise-returning callbacks). The thrown
 * value is the reconstructed tagged error, so UI can still match on tags.
 */
export const throwOnChannel3Error = <TValue>(result: Result<TValue, Channel3Error>): TValue => {
  if (result.status === "error") {
    throw result.error;
  }
  return result.value;
};
