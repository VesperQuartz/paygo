import { Result, isPanic } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import {
  PayPalSubscriptionCreateFailed,
  PayPalSubscriptionIdMissing,
  PayPalSubscriptionNotActive,
  PayPalSubscriptionSyncFailed,
} from "@/lib/paypal/errors";
import { SubscriptionStorageError, SubscriptionUnauthenticated } from "./errors";
import { proStatusCodec, subscriptionStartCodec } from "./wire";

const expectPanic = (run: () => unknown) => {
  try {
    run();
  } catch (cause) {
    expect(isPanic(cause)).toBe(true);
    return;
  }
  throw new Error("expected a panic");
};

describe("subscriptionStartCodec", () => {
  it("round-trips a subscription id", async () => {
    const wire = await subscriptionStartCodec.serializeUnsafe(
      Result.ok({ subscriptionId: "I-123" }),
    );
    expect(wire).toEqual({ status: "ok", value: { subscriptionId: "I-123" } });

    const back = await subscriptionStartCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value.subscriptionId).toBe("I-123");
  });
});

describe("proStatusCodec", () => {
  it("round-trips an active Pro state", async () => {
    const status = { pro: true, status: "ACTIVE", planId: "P-1" };
    const wire = await proStatusCodec.serializeUnsafe(Result.ok(status));

    const back = await proStatusCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual(status);
  });

  it("round-trips the empty free state", async () => {
    const status = { pro: false, status: null, planId: null };
    const wire = await proStatusCodec.serializeUnsafe(Result.ok(status));

    const back = await proStatusCodec.deserializeUnsafe(wire);
    if (back.status !== "ok") throw new Error("expected ok");
    expect(back.value).toEqual(status);
  });

  it("round-trips session and storage errors", async () => {
    const sessionWire = await proStatusCodec.serializeUnsafe(
      Result.err(new SubscriptionUnauthenticated({ operation: "getProStatus" })),
    );
    const sessionBack = await proStatusCodec.deserializeUnsafe(sessionWire);
    if (sessionBack.status !== "error") throw new Error("expected error");
    if (!SubscriptionUnauthenticated.is(sessionBack.error))
      throw new Error("expected session error");
    expect(sessionBack.error.operation).toBe("getProStatus");

    const storageWire = await proStatusCodec.serializeUnsafe(
      Result.err(new SubscriptionStorageError({ operation: "upsertSubscription" })),
    );
    const storageBack = await proStatusCodec.deserializeUnsafe(storageWire);
    if (storageBack.status !== "error") throw new Error("expected error");
    if (!SubscriptionStorageError.is(storageBack.error)) throw new Error("expected storage error");
    expect(storageBack.error.operation).toBe("upsertSubscription");
  });

  it("round-trips PayPal subscription failures", async () => {
    const notActiveWire = await proStatusCodec.serializeUnsafe(
      Result.err(
        new PayPalSubscriptionNotActive({ subscriptionId: "I-9", status: "APPROVAL_PENDING" }),
      ),
    );
    const notActiveBack = await proStatusCodec.deserializeUnsafe(notActiveWire);
    if (notActiveBack.status !== "error") throw new Error("expected error");
    if (!PayPalSubscriptionNotActive.is(notActiveBack.error))
      throw new Error("expected not-active");
    expect(notActiveBack.error.subscriptionId).toBe("I-9");
    expect(notActiveBack.error.status).toBe("APPROVAL_PENDING");

    const syncWire = await proStatusCodec.serializeUnsafe(
      Result.err(new PayPalSubscriptionSyncFailed({ subscriptionId: "I-9", statusCode: 500 })),
    );
    const syncBack = await proStatusCodec.deserializeUnsafe(syncWire);
    if (syncBack.status !== "error") throw new Error("expected error");
    if (!PayPalSubscriptionSyncFailed.is(syncBack.error)) throw new Error("expected sync failure");
    expect(syncBack.error.statusCode).toBe(500);

    const createWire = await proStatusCodec.serializeUnsafe(
      Result.err(new PayPalSubscriptionCreateFailed({ statusCode: 401 })),
    );
    const createBack = await proStatusCodec.deserializeUnsafe(createWire);
    if (createBack.status !== "error") throw new Error("expected error");
    if (!PayPalSubscriptionCreateFailed.is(createBack.error)) {
      throw new Error("expected create failure");
    }

    const idWire = await proStatusCodec.serializeUnsafe(
      Result.err(new PayPalSubscriptionIdMissing()),
    );
    const idBack = await proStatusCodec.deserializeUnsafe(idWire);
    if (idBack.status !== "error") throw new Error("expected error");
    expect(PayPalSubscriptionIdMissing.is(idBack.error)).toBe(true);
  });

  it("panics on unknown operations and malformed tags", () => {
    expectPanic(() =>
      proStatusCodec.deserializeUnsafe({
        status: "error",
        error: { _tag: "SubscriptionStorageError", operation: "not-an-operation" },
      }),
    );
    expectPanic(() => proStatusCodec.deserializeUnsafe({ status: "ok", value: { pro: "yes" } }));
  });
});
