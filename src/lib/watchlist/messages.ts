import { isWatchlistError, type WatchlistError } from "./errors";

/**
 * Developer-facing context stays on the tagged error; this maps each variant
 * to a user-safe message at the presentation boundary.
 */
export const watchlistUserMessage = (error: WatchlistError): string =>
  error.match({
    WatchlistUnauthenticated: () => "Sign in to save products to your watchlist.",
    WatchlistStorageError: () => "Something went wrong with your watchlist. Please try again.",
    WatchlistLimitReached: (limitError) =>
      `Free accounts watch up to ${limitError.limit} products. Upgrade to Pro for unlimited watches and automatic email alerts.`,
  });

/** User-safe message for any error value, including unexpected ones. */
export const watchlistErrorMessage = (error: unknown): string =>
  isWatchlistError(error) ? watchlistUserMessage(error) : "Something went wrong. Please try again.";
