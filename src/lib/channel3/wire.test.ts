import { Result, UnhandledException, isPanic } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import {
  Channel3RequestRejected,
  Channel3Unavailable,
  ProductNotFound,
  type Channel3Error,
} from "./errors";
import { channel3PriceHistoryCodec, channel3ProductCodec, channel3ProductPageCodec } from "./wire";

const expectPanic = (run: () => unknown) => {
  try {
    run();
  } catch (cause) {
    expect(isPanic(cause)).toBe(true);
    return;
  }
  throw new Error("expected a panic");
};

describe("channel3ProductPageCodec", () => {
  it("round-trips a page of products", async () => {
    const page = {
      products: [{ id: "p1", title: "Widget", offers: [] }],
      nextPageToken: "cursor-1",
    };

    const wire = await channel3ProductPageCodec.serializeUnsafe(Result.ok(page));
    expect(wire).toEqual({ status: "ok", value: page });

    const back = await channel3ProductPageCodec.deserializeUnsafe(wire);
    expect(back.status).toBe("ok");
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual(page);
  });
});

describe("channel3PriceHistoryCodec", () => {
  it("serializes timestamps as ISO strings and restores Dates", async () => {
    const payload = {
      canonical_product_id: "p1",
      product_title: "Widget",
      history: [{ timestamp: new Date("2026-06-01T12:00:00.000Z"), price: 99.5, currency: "USD" }],
      statistics: {
        mean: 100,
        std_dev: 5,
        min_price: 90,
        max_price: 110,
        current_price: 99.5,
        current_status: "low" as const,
        currency: "USD",
      },
    };

    const wire = await channel3PriceHistoryCodec.serializeUnsafe(Result.ok(payload));
    expect(wire.status).toBe("ok");
    if (wire.status !== "ok") throw new Error("expected ok");
    expect(wire.value.history[0]?.timestamp).toBe("2026-06-01T12:00:00.000Z");

    const back = await channel3PriceHistoryCodec.deserializeUnsafe(wire);
    expect(back.status).toBe("ok");
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value.history[0]?.timestamp).toBeInstanceOf(Date);
    expect(back.value.history[0]?.timestamp.toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(back.value.statistics).toEqual(payload.statistics);
  });

  it("rejects malformed statistics", () => {
    expectPanic(() =>
      channel3PriceHistoryCodec.deserializeUnsafe({
        status: "ok",
        value: {
          canonical_product_id: "p1",
          history: [],
          statistics: { mean: "not a number" },
        },
      }),
    );
  });
});

describe("channel3 error wire contract", () => {
  const errorCases: Channel3Error[] = [
    new Channel3Unavailable({
      operation: "searchProducts",
      statusCode: 503,
      cause: new Error("secret-cause"),
    }),
    new Channel3Unavailable({ operation: "getPriceHistory" }),
    new Channel3RequestRejected({
      operation: "getProduct",
      statusCode: 401,
      cause: new Error("secret-cause"),
    }),
    new ProductNotFound({ productId: "p9", cause: new Error("secret-cause") }),
    new UnhandledException({ cause: new Error("secret-cause") }),
  ];

  for (const error of errorCases) {
    it(`round-trips ${error._tag} without leaking internals`, async () => {
      const wire = await channel3ProductCodec.serializeUnsafe(Result.err(error));
      expect(wire.status).toBe("error");
      if (wire.status !== "error") throw new Error("expected error");

      const serialized = JSON.stringify(wire);
      expect(serialized).not.toContain("secret-cause");
      expect(wire.error).not.toHaveProperty("cause");
      expect(wire.error).not.toHaveProperty("message");
      expect(wire.error).not.toHaveProperty("stack");

      const back = await channel3ProductCodec.deserializeUnsafe(wire);
      expect(back.status).toBe("error");
      if (back.status !== "error") throw new Error("expected error");

      expect(back.error._tag).toBe(error._tag);
    });
  }

  it("reconstructs Channel3Unavailable with its structured fields", async () => {
    const original = new Channel3Unavailable({ operation: "getProduct", statusCode: 500 });
    const wire = await channel3ProductCodec.serializeUnsafe(Result.err(original));
    const back = await channel3ProductCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!Channel3Unavailable.is(back.error)) throw new Error("expected Channel3Unavailable");

    expect(back.error.operation).toBe("getProduct");
    expect(back.error.statusCode).toBe(500);
    expect(back.error.message).toContain("getProduct");
  });

  it("reconstructs ProductNotFound with its product id", async () => {
    const wire = await channel3ProductCodec.serializeUnsafe(
      Result.err(new ProductNotFound({ productId: "p9" })),
    );
    const back = await channel3ProductCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!ProductNotFound.is(back.error)) throw new Error("expected ProductNotFound");

    expect(back.error.productId).toBe("p9");
  });
});

describe("channel3 deserialization defenses", () => {
  it("panics on a malformed envelope", () => {
    expectPanic(() => channel3ProductCodec.deserializeUnsafe({ nonsense: true }));
  });

  it("panics on a malformed ok payload", () => {
    expectPanic(() => channel3ProductCodec.deserializeUnsafe({ status: "ok", value: { id: 42 } }));
  });

  it("panics on a malformed error payload", () => {
    expectPanic(() =>
      channel3ProductCodec.deserializeUnsafe({
        status: "error",
        error: { _tag: "Channel3Unavailable", operation: "not-an-operation", statusCode: null },
      }),
    );
  });

  it("panics on an unknown error tag", () => {
    expectPanic(() =>
      channel3ProductCodec.deserializeUnsafe({ status: "error", error: { _tag: "Mystery" } }),
    );
  });
});
