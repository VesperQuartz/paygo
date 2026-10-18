import { Result, isPanic } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import { WatchlistLimitReached, WatchlistStorageError, WatchlistUnauthenticated } from "./errors";
import {
  watchlistEntryCodec,
  watchlistListCodec,
  watchlistRemovalCodec,
  watchlistStateCodec,
} from "./wire";

const expectPanic = (run: () => unknown) => {
  try {
    run();
  } catch (cause) {
    expect(isPanic(cause)).toBe(true);
    return;
  }
  throw new Error("expected a panic");
};

const sampleEntry = {
  id: "w1",
  productId: "p1",
  title: "Widget",
  brand: "Acme",
  imageUrl: null,
  priceAmount: 19.99,
  priceCurrency: "USD",
  addedAt: new Date("2026-10-01T10:00:00.000Z"),
};

describe("watchlistListCodec", () => {
  it("serializes timestamps as ISO strings and restores Dates", async () => {
    const wire = await watchlistListCodec.serializeUnsafe(Result.ok([sampleEntry]));
    expect(wire.status).toBe("ok");
    if (wire.status !== "ok") throw new Error("expected ok");
    expect(wire.value[0]?.addedAt).toBe("2026-10-01T10:00:00.000Z");

    const back = await watchlistListCodec.deserializeUnsafe(wire);
    expect(back.status).toBe("ok");
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual([sampleEntry]);
    expect(back.value[0]?.addedAt).toBeInstanceOf(Date);
    expect(back.value[0]?.addedAt.toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });

  it("panics on malformed entries", () => {
    expectPanic(() =>
      watchlistListCodec.deserializeUnsafe({ status: "ok", value: [{ id: 42, addedAt: "x" }] }),
    );
  });
});

describe("watchlistStateCodec", () => {
  it("round-trips the signed-in state", async () => {
    const wire = await watchlistStateCodec.serializeUnsafe(
      Result.ok({ signedIn: true, watched: true }),
    );
    expect(wire).toEqual({ status: "ok", value: { signedIn: true, watched: true } });

    const back = await watchlistStateCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual({ signedIn: true, watched: true });
  });
});

describe("watchlistRemovalCodec", () => {
  it("round-trips an empty removal", async () => {
    const wire = await watchlistRemovalCodec.serializeUnsafe(Result.ok(null));
    expect(wire).toEqual({ status: "ok", value: null });

    const back = await watchlistRemovalCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toBeNull();
  });
});

describe("watchlist error wire contract", () => {
  it("round-trips WatchlistUnauthenticated without leaking internals", async () => {
    const error = new WatchlistUnauthenticated({ operation: "addWatchlistItem" });
    const wire = await watchlistEntryCodec.serializeUnsafe(Result.err(error));
    expect(wire.status).toBe("error");
    if (wire.status !== "error") throw new Error("expected error");
    expect(wire.error).not.toHaveProperty("cause");
    expect(wire.error).not.toHaveProperty("message");
    expect(wire.error).not.toHaveProperty("stack");

    const back = await watchlistEntryCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!WatchlistUnauthenticated.is(back.error)) throw new Error("expected unauthenticated");
    expect(back.error.operation).toBe("addWatchlistItem");
  });

  it("round-trips WatchlistStorageError without leaking its cause", async () => {
    const error = new WatchlistStorageError({
      operation: "listWatchlist",
      cause: new Error("secret-cause"),
    });
    const wire = await watchlistEntryCodec.serializeUnsafe(Result.err(error));
    expect(wire.status).toBe("error");
    if (wire.status !== "error") throw new Error("expected error");
    expect(JSON.stringify(wire)).not.toContain("secret-cause");

    const back = await watchlistEntryCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!WatchlistStorageError.is(back.error)) throw new Error("expected storage error");
    expect(back.error.operation).toBe("listWatchlist");
    expect(back.error.message).toContain("listWatchlist");
  });

  it("round-trips WatchlistLimitReached with its cap", async () => {
    const error = new WatchlistLimitReached({ limit: 3 });
    const wire = await watchlistEntryCodec.serializeUnsafe(Result.err(error));
    expect(wire.status).toBe("error");
    if (wire.status !== "error") throw new Error("expected error");

    const back = await watchlistEntryCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!WatchlistLimitReached.is(back.error)) throw new Error("expected limit error");
    expect(back.error.limit).toBe(3);
  });
});

describe("watchlist deserialization defenses", () => {
  it("panics on a malformed envelope", () => {
    expectPanic(() => watchlistListCodec.deserializeUnsafe({ nonsense: true }));
  });

  it("panics on an unknown error tag", () => {
    expectPanic(() =>
      watchlistListCodec.deserializeUnsafe({ status: "error", error: { _tag: "Mystery" } }),
    );
  });

  it("panics on an unknown operation", () => {
    expectPanic(() =>
      watchlistListCodec.deserializeUnsafe({
        status: "error",
        error: { _tag: "WatchlistStorageError", operation: "not-an-operation" },
      }),
    );
  });
});
