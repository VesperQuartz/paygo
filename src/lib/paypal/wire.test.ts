import { Result, isPanic } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import { PayPalOrderCaptureFailed, PayPalOrderCreateFailed, PayPalOrderIdMissing } from "./errors";
import { paypalOrderCaptureCodec, paypalOrderCreateCodec } from "./wire";

const expectPanic = (run: () => unknown) => {
  try {
    run();
  } catch (cause) {
    expect(isPanic(cause)).toBe(true);
    return;
  }
  throw new Error("expected a panic");
};

describe("paypalOrderCreateCodec", () => {
  it("round-trips an order id", async () => {
    const wire = await paypalOrderCreateCodec.serializeUnsafe(Result.ok("ORDER-123"));
    expect(wire).toEqual({ status: "ok", value: "ORDER-123" });

    const back = await paypalOrderCreateCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toBe("ORDER-123");
  });

  it("round-trips create failures with their status code", async () => {
    const wire = await paypalOrderCreateCodec.serializeUnsafe(
      Result.err(new PayPalOrderCreateFailed({ statusCode: 401 })),
    );
    expect(wire.status).toBe("error");
    if (wire.status !== "error") throw new Error("expected error");

    const back = await paypalOrderCreateCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!PayPalOrderCreateFailed.is(back.error)) throw new Error("expected create failure");
    expect(back.error.statusCode).toBe(401);
    // The developer-facing message is recomputed on the client, not trusted from the wire.
    expect(back.error.message).toContain("createOrder");
  });

  it("round-trips the missing-id contract violation", async () => {
    const wire = await paypalOrderCreateCodec.serializeUnsafe(
      Result.err(new PayPalOrderIdMissing()),
    );

    const back = await paypalOrderCreateCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    expect(PayPalOrderIdMissing.is(back.error)).toBe(true);
  });

  it("panics on malformed payloads", () => {
    expectPanic(() => paypalOrderCreateCodec.deserializeUnsafe({ status: "ok", value: 42 }));
  });
});

describe("paypalOrderCaptureCodec", () => {
  it("round-trips a capture summary", async () => {
    const summary = { orderId: "ORDER-1", status: "COMPLETED" };
    const wire = await paypalOrderCaptureCodec.serializeUnsafe(Result.ok(summary));
    expect(wire).toEqual({ status: "ok", value: summary });

    const back = await paypalOrderCaptureCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual(summary);
  });

  it("round-trips capture failures with the order id", async () => {
    const wire = await paypalOrderCaptureCodec.serializeUnsafe(
      Result.err(new PayPalOrderCaptureFailed({ orderId: "ORDER-9", statusCode: 422 })),
    );

    const back = await paypalOrderCaptureCodec.deserializeUnsafe(wire);
    if (back.status !== "error") throw new Error("expected error");
    if (!PayPalOrderCaptureFailed.is(back.error)) throw new Error("expected capture failure");
    expect(back.error.orderId).toBe("ORDER-9");
    expect(back.error.statusCode).toBe(422);
  });

  it("refuses an unknown error tag", () => {
    expectPanic(() =>
      paypalOrderCaptureCodec.deserializeUnsafe({
        status: "error",
        error: { _tag: "NotAPayPalError" },
      }),
    );
  });
});
