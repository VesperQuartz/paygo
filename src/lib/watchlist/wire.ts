import { Result } from "better-result";
import z from "zod";

import {
  WATCHLIST_OPERATIONS,
  WatchlistLimitReached,
  WatchlistStorageError,
  WatchlistUnauthenticated,
  type WatchlistError,
} from "./errors";

/** A watched product as the UI consumes it (timestamps already hydrated). */
export interface WatchlistEntry {
  id: string;
  productId: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  addedAt: Date;
}

/** Whether the current viewer is signed in and already watches a product. */
export interface WatchlistState {
  signedIn: boolean;
  watched: boolean;
}

// --- Ok payloads ---

const entryToWire = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  brand: z.string().nullable(),
  imageUrl: z.string().nullable(),
  priceAmount: z.number().nullable(),
  priceCurrency: z.string().nullable(),
  addedAt: z.date().transform((value) => value.toISOString()),
});

const entryFromWire = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  brand: z.string().nullable(),
  imageUrl: z.string().nullable(),
  priceAmount: z.number().nullable(),
  priceCurrency: z.string().nullable(),
  addedAt: z.coerce.date(),
});

const listToWire = z.array(entryToWire);

const listFromWire = z.array(entryFromWire);

const stateToWire = z.object({
  signedIn: z.boolean(),
  watched: z.boolean(),
});

const stateFromWire = stateToWire;

const removalToWire = z.null();

const removalFromWire = z.null();

// --- Error payloads ---
// Wire errors expose only stable codes and safe fields: no message (the
// constructors recompute it) and no cause (it may hold database internals).

// Exported so sibling features (alerts) can compose their own codecs with the
// same error contract.
export const watchlistErrorToWire = z.discriminatedUnion("_tag", [
  z.object({
    _tag: z.literal("WatchlistUnauthenticated"),
    operation: z.enum(WATCHLIST_OPERATIONS),
  }),
  z.object({
    _tag: z.literal("WatchlistStorageError"),
    operation: z.enum(WATCHLIST_OPERATIONS),
  }),
  z.object({
    _tag: z.literal("WatchlistLimitReached"),
    limit: z.number().int().positive(),
  }),
]);

export const watchlistErrorFromWire = z.discriminatedUnion("_tag", [
  z
    .object({
      _tag: z.literal("WatchlistUnauthenticated"),
      operation: z.enum(WATCHLIST_OPERATIONS),
    })
    .transform((wire) => new WatchlistUnauthenticated({ operation: wire.operation })),
  z
    .object({
      _tag: z.literal("WatchlistStorageError"),
      operation: z.enum(WATCHLIST_OPERATIONS),
    })
    .transform((wire) => new WatchlistStorageError({ operation: wire.operation })),
  z
    .object({
      _tag: z.literal("WatchlistLimitReached"),
      limit: z.number().int().positive(),
    })
    .transform((wire) => new WatchlistLimitReached({ limit: wire.limit })),
]);

// --- Boundary codecs (see docs/better-result-adoption.md, section 6) ---

export const watchlistEntryCodec = Result.codec({
  serialize: { ok: entryToWire, err: watchlistErrorToWire },
  deserialize: { ok: entryFromWire, err: watchlistErrorFromWire },
});

export const watchlistListCodec = Result.codec({
  serialize: { ok: listToWire, err: watchlistErrorToWire },
  deserialize: { ok: listFromWire, err: watchlistErrorFromWire },
});

export const watchlistStateCodec = Result.codec({
  serialize: { ok: stateToWire, err: watchlistErrorToWire },
  deserialize: { ok: stateFromWire, err: watchlistErrorFromWire },
});

export const watchlistRemovalCodec = Result.codec({
  serialize: { ok: removalToWire, err: watchlistErrorToWire },
  deserialize: { ok: removalFromWire, err: watchlistErrorFromWire },
});

/**
 * Explicit seam for consumers that only understand thrown errors (TanStack
 * Query error states and vendored Promise-returning callbacks). The thrown
 * value is the reconstructed tagged error, so UI can still match on tags.
 */
export const throwOnWatchlistError = <TValue>(result: Result<TValue, WatchlistError>): TValue => {
  if (result.status === "error") {
    throw result.error;
  }
  return result.value;
};
