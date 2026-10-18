import { capturePayPalOrder, createPayPalOrder } from "@/services/paypal";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";

export const createOrder = createServerFn({ method: "POST" }).handler(async () => {
  const orderId = await createPayPalOrder("10.99");
  return orderId;
});

export const captureOrder = createServerFn({ method: "POST", strict: false })
  .validator(z.string())
  .handler(async ({ data }) => {
    const capture = await capturePayPalOrder(data);
    return capture;
  });
