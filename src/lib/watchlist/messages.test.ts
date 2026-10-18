import { describe, expect, it } from "vite-plus/test";

import { WatchlistLimitReached, WatchlistStorageError, WatchlistUnauthenticated } from "./errors";
import { watchlistErrorMessage, watchlistUserMessage } from "./messages";

describe("watchlist messages", () => {
  it("maps unauthenticated to a sign-in prompt", () => {
    const message = watchlistUserMessage(
      new WatchlistUnauthenticated({ operation: "listWatchlist" }),
    );
    expect(message).toMatch(/sign in/i);
  });

  it("maps storage errors to a retry-safe message", () => {
    const message = watchlistUserMessage(
      new WatchlistStorageError({ operation: "addWatchlistItem" }),
    );
    expect(message).toMatch(/try again/i);
  });

  it("maps the free-tier cap to an upgrade hint with the limit", () => {
    const message = watchlistUserMessage(new WatchlistLimitReached({ limit: 3 }));
    expect(message).toContain("3 products");
    expect(message).toMatch(/pro/i);
  });

  it("falls back safely for unknown error values", () => {
    expect(watchlistErrorMessage(new Error("secret-cause"))).toBe(
      "Something went wrong. Please try again.",
    );
    expect(watchlistErrorMessage("not-an-error")).toBe("Something went wrong. Please try again.");
  });
});
