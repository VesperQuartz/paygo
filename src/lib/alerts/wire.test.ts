import { Result, isPanic } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import { WatchlistStorageError, WatchlistUnauthenticated } from "@/lib/watchlist/errors";
import { alertsRunCodec, mergeAlertsSummaries } from "./wire";

const expectPanic = (run: () => unknown) => {
  try {
    run();
  } catch (cause) {
    expect(isPanic(cause)).toBe(true);
    return;
  }
  throw new Error("expected a panic");
};

const sampleSummary = {
  productsChecked: 2,
  productsFailed: 0,
  itemsChecked: 3,
  alertsSent: 1,
  alertsFailed: 0,
  proRequired: 1,
  skipped: 1,
};

describe("alertsRunCodec", () => {
  it("round-trips a run summary", async () => {
    const wire = await alertsRunCodec.serializeUnsafe(Result.ok(sampleSummary));
    expect(wire).toEqual({ status: "ok", value: sampleSummary });

    const back = await alertsRunCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual(sampleSummary);
  });

  it("shares the watchlist error contract", async () => {
    const error = new WatchlistUnauthenticated({ operation: "runPriceAlerts" });
    const wire = await alertsRunCodec.serializeUnsafe(Result.err(error));
    expect(wire.status).toBe("error");
    if (wire.status !== "error") throw new Error("expected error");

    const back = await alertsRunCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!WatchlistUnauthenticated.is(back.error)) throw new Error("expected unauthenticated");
    expect(back.error.operation).toBe("runPriceAlerts");
  });

  it("round-trips storage errors with the alert operations", async () => {
    const error = new WatchlistStorageError({ operation: "listWatchlistForAlerts" });
    const wire = await alertsRunCodec.serializeUnsafe(Result.err(error));

    const back = await alertsRunCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!WatchlistStorageError.is(back.error)) throw new Error("expected storage error");
    expect(back.error.operation).toBe("listWatchlistForAlerts");
  });

  it("panics on malformed summaries", () => {
    expectPanic(() =>
      alertsRunCodec.deserializeUnsafe({ status: "ok", value: { productsChecked: -1 } }),
    );
  });

  it("panics on unknown operations", () => {
    expectPanic(() =>
      alertsRunCodec.deserializeUnsafe({
        status: "error",
        error: { _tag: "WatchlistStorageError", operation: "not-an-operation" },
      }),
    );
  });
});

describe("mergeAlertsSummaries", () => {
  it("sums every counter across per-product summaries", () => {
    const merged = mergeAlertsSummaries([
      { ...sampleSummary, productsChecked: 1 },
      {
        productsChecked: 1,
        productsFailed: 1,
        itemsChecked: 0,
        alertsSent: 0,
        alertsFailed: 0,
        proRequired: 0,
        skipped: 0,
      },
    ]);

    expect(merged).toEqual({ ...sampleSummary, productsFailed: 1 });
  });

  it("is the zero summary for no runs", () => {
    expect(mergeAlertsSummaries([])).toEqual({
      productsChecked: 0,
      productsFailed: 0,
      itemsChecked: 0,
      alertsSent: 0,
      alertsFailed: 0,
      proRequired: 0,
      skipped: 0,
    });
  });
});
