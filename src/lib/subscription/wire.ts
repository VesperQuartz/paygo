import { Result } from "better-result";
import z from "zod";

import {
  PayPalSubscriptionCreateFailed,
  PayPalSubscriptionIdMissing,
  PayPalSubscriptionNotActive,
  PayPalSubscriptionSyncFailed,
} from "@/lib/paypal/errors";
import {
  SUBSCRIPTION_OPERATIONS,
  SubscriptionStorageError,
  SubscriptionUnauthenticated,
} from "./errors";

/** Pro state as the UI consumes it. */
export interface ProStatus {
  pro: boolean;
  status: string | null;
  planId: string | null;
}

// --- Ok payloads ---

const proStatusToWire = z.object({
  pro: z.boolean(),
  status: z.string().nullable(),
  planId: z.string().nullable(),
});

const proStatusFromWire = proStatusToWire;

const startToWire = z.object({ subscriptionId: z.string() });

const startFromWire = startToWire;

// --- Error payloads ---
// Wire errors expose only stable codes and safe fields: no message (the
// constructors recompute it) and no cause (it may hold upstream internals).

const errorToWire = z.discriminatedUnion("_tag", [
  z.object({
    _tag: z.literal("SubscriptionUnauthenticated"),
    operation: z.enum(SUBSCRIPTION_OPERATIONS),
  }),
  z.object({
    _tag: z.literal("SubscriptionStorageError"),
    operation: z.enum(SUBSCRIPTION_OPERATIONS),
  }),
  z.object({
    _tag: z.literal("PayPalSubscriptionCreateFailed"),
    statusCode: z.number().int().optional(),
  }),
  z.object({
    _tag: z.literal("PayPalSubscriptionIdMissing"),
  }),
  z.object({
    _tag: z.literal("PayPalSubscriptionSyncFailed"),
    subscriptionId: z.string(),
    statusCode: z.number().int().optional(),
  }),
  z.object({
    _tag: z.literal("PayPalSubscriptionNotActive"),
    subscriptionId: z.string(),
    status: z.string(),
  }),
]);

const errorFromWire = z.discriminatedUnion("_tag", [
  z
    .object({
      _tag: z.literal("SubscriptionUnauthenticated"),
      operation: z.enum(SUBSCRIPTION_OPERATIONS),
    })
    .transform((wire) => new SubscriptionUnauthenticated({ operation: wire.operation })),
  z
    .object({
      _tag: z.literal("SubscriptionStorageError"),
      operation: z.enum(SUBSCRIPTION_OPERATIONS),
    })
    .transform((wire) => new SubscriptionStorageError({ operation: wire.operation })),
  z
    .object({
      _tag: z.literal("PayPalSubscriptionCreateFailed"),
      statusCode: z.number().int().optional(),
    })
    .transform((wire) => new PayPalSubscriptionCreateFailed({ statusCode: wire.statusCode })),
  z
    .object({
      _tag: z.literal("PayPalSubscriptionIdMissing"),
    })
    .transform(() => new PayPalSubscriptionIdMissing()),
  z
    .object({
      _tag: z.literal("PayPalSubscriptionSyncFailed"),
      subscriptionId: z.string(),
      statusCode: z.number().int().optional(),
    })
    .transform(
      (wire) =>
        new PayPalSubscriptionSyncFailed({
          subscriptionId: wire.subscriptionId,
          statusCode: wire.statusCode,
        }),
    ),
  z
    .object({
      _tag: z.literal("PayPalSubscriptionNotActive"),
      subscriptionId: z.string(),
      status: z.string(),
    })
    .transform(
      (wire) =>
        new PayPalSubscriptionNotActive({
          subscriptionId: wire.subscriptionId,
          status: wire.status,
        }),
    ),
]);

// --- Boundary codecs (see docs/better-result-adoption.md, section 6) ---

export const subscriptionStartCodec = Result.codec({
  serialize: { ok: startToWire, err: errorToWire },
  deserialize: { ok: startFromWire, err: errorFromWire },
});

export const proStatusCodec = Result.codec({
  serialize: { ok: proStatusToWire, err: errorToWire },
  deserialize: { ok: proStatusFromWire, err: errorFromWire },
});
