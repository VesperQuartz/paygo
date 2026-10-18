import { TaggedError } from "better-result";

/** Watchlist operations exposed through this app's server functions. */
export const WATCHLIST_OPERATIONS = [
  "listWatchlist",
  "addWatchlistItem",
  "removeWatchlistItem",
  "isProductWatched",
  "isWatchlistAtLimit",
  "runPriceAlerts",
  "listWatchlistForAlerts",
  "listWatchedProductIds",
  "markWatchlistItemChecked",
  "markWatchlistItemAlerted",
] as const;

export type WatchlistOperation = (typeof WATCHLIST_OPERATIONS)[number];

/**
 * The watchlist call arrived without a session. Not a storage fault: the user
 * needs to sign in, then the same call can retry unchanged.
 */
export class WatchlistUnauthenticated extends TaggedError("WatchlistUnauthenticated")<{
  operation: WatchlistOperation;
  message: string;
}> {
  constructor(args: { operation: WatchlistOperation }) {
    super({
      operation: args.operation,
      message: `The ${args.operation} watchlist call needs a signed-in user. Show a sign-in path and retry the call after authentication; watchlists are per-account.`,
    });
  }
}

/**
 * The database rejected a watchlist query (connection lost, credentials,
 * schema drift). The cause stays server-side; the user only sees a retry hint.
 */
export class WatchlistStorageError extends TaggedError("WatchlistStorageError")<{
  operation: WatchlistOperation;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { operation: WatchlistOperation; cause?: unknown }) {
    super({
      operation: args.operation,
      cause: args.cause,
      message: `Watchlist storage call "${args.operation}" failed. Inspect the server logs for the database cause; this is an integration problem, not a user error.`,
    });
  }
}

/**
 * The add was rejected because the account is on the free tier and at the
 * watchlist cap. Expected outcome, not a fault: the UI should point at Pro
 * (or at removing an item) and the call can retry after the tier changes.
 */
export class WatchlistLimitReached extends TaggedError("WatchlistLimitReached")<{
  limit: number;
  message: string;
}> {
  constructor(args: { limit: number }) {
    super({
      limit: args.limit,
      message: `The free watchlist holds ${args.limit} products and this account is at the cap without an active Pro subscription. Show the upgrade path (or removal) and retry after the tier changes.`,
    });
  }
}

/** Everything the watchlist path can report across the server-function boundary. */
export type WatchlistError =
  | WatchlistUnauthenticated
  | WatchlistStorageError
  | WatchlistLimitReached;

export const isWatchlistError = (value: unknown): value is WatchlistError =>
  WatchlistUnauthenticated.is(value) ||
  WatchlistStorageError.is(value) ||
  WatchlistLimitReached.is(value);
