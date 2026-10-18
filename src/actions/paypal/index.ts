import { createServerFn } from "@tanstack/react-start";
import z from "zod";

import { paypalOrderCaptureCodec, paypalOrderCreateCodec } from "@/lib/paypal/wire";
import { capturePayPalOrder, createPayPalOrder } from "@/services/paypal";

// The starter's fixed-amount demo order; the Pro plan uses subscriptions.
const DEMO_ORDER_AMOUNT = "10.99";

export const createOrder = createServerFn({ method: "POST" }).handler(async () => {
  const result = await createPayPalOrder(DEMO_ORDER_AMOUNT);

  return await paypalOrderCreateCodec.serializeUnsafe(result);
});

export const captureOrder = createServerFn({ method: "POST", strict: false })
  .validator(z.string())
  .handler(async ({ data }) => {
    const result = await capturePayPalOrder(data);

    return await paypalOrderCaptureCodec.serializeUnsafe(result);
  });
