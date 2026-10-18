import { Result } from "better-result";
import z from "zod";

import { PayPalOrderCaptureFailed, PayPalOrderCreateFailed, PayPalOrderIdMissing } from "./errors";

/** Capture outcome as the UI consumes it. */
export interface PayPalCaptureSummary {
  orderId: string;
  status: string;
}

// --- Ok payloads ---

const captureToWire = z.object({
  orderId: z.string(),
  status: z.string(),
});

const captureFromWire = captureToWire;

// --- Error payloads ---
// Wire errors expose only stable codes and safe fields: no message (the
// constructors recompute it) and no cause (it may hold upstream internals).

const orderErrorToWire = z.discriminatedUnion("_tag", [
  z.object({
    _tag: z.literal("PayPalOrderCreateFailed"),
    statusCode: z.number().int().optional(),
  }),
  z.object({
    _tag: z.literal("PayPalOrderIdMissing"),
  }),
  z.object({
    _tag: z.literal("PayPalOrderCaptureFailed"),
    orderId: z.string(),
    statusCode: z.number().int().optional(),
  }),
]);

const orderErrorFromWire = z.discriminatedUnion("_tag", [
  z
    .object({
      _tag: z.literal("PayPalOrderCreateFailed"),
      statusCode: z.number().int().optional(),
    })
    .transform((wire) => new PayPalOrderCreateFailed({ statusCode: wire.statusCode })),
  z
    .object({
      _tag: z.literal("PayPalOrderIdMissing"),
    })
    .transform(() => new PayPalOrderIdMissing()),
  z
    .object({
      _tag: z.literal("PayPalOrderCaptureFailed"),
      orderId: z.string(),
      statusCode: z.number().int().optional(),
    })
    .transform(
      (wire) =>
        new PayPalOrderCaptureFailed({ orderId: wire.orderId, statusCode: wire.statusCode }),
    ),
]);

// --- Boundary codecs (see docs/better-result-adoption.md, section 6) ---

export const paypalOrderCreateCodec = Result.codec({
  serialize: { ok: z.string(), err: orderErrorToWire },
  deserialize: { ok: z.string(), err: orderErrorFromWire },
});

export const paypalOrderCaptureCodec = Result.codec({
  serialize: { ok: captureToWire, err: orderErrorToWire },
  deserialize: { ok: captureFromWire, err: orderErrorFromWire },
});
