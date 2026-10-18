import { paypalClient } from "@/lib/paypal/pay";
import { CheckoutPaymentIntent, OrdersController } from "@paypal/paypal-server-sdk";

// Splitting the client out means any controller you add later (Payments, Vault, Subscriptions) reuses the same authenticated instance instead of spinning up its own. The orders module wraps two core actions:
//  1. Create a PayPal order for a given USD amount.
//  2. Capture (finalize) an approved PayPal order.

const ordersController = new OrdersController(paypalClient);

export const createPayPalOrder = async (amount: string) => {
  const { result } = await ordersController.createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: { currencyCode: "USD", value: amount },
        },
      ],
    },
  });

  if (!result.id) {
    throw new Error("PayPal order creation failed: missing order ID");
  }

  return result.id;
};

export const capturePayPalOrder = async (orderId: string) => {
  const { result } = await ordersController.captureOrder({ id: orderId });
  return result;
};
