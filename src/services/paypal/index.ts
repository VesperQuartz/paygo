import {
  ApiError,
  CheckoutPaymentIntent,
  OrdersController,
  SubscriptionsController,
} from "@paypal/paypal-server-sdk";
import { Result, panic } from "better-result";

import { serverEnv } from "@/env/server";
import { paypalClient } from "@/lib/paypal/pay";
import {
  PayPalOrderCaptureFailed,
  PayPalOrderCreateFailed,
  PayPalOrderIdMissing,
  PayPalSubscriptionCreateFailed,
  PayPalSubscriptionIdMissing,
  PayPalSubscriptionSyncFailed,
} from "@/lib/paypal/errors";

const ordersController = new OrdersController(paypalClient);
const subscriptionsController = new SubscriptionsController(paypalClient);

/** HTTP status of a PayPal SDK failure, when the cause is the SDK's ApiError. */
const statusOf = (cause: unknown): number | undefined =>
  cause instanceof ApiError ? cause.statusCode : undefined;

/** Capture outcome as the UI consumes it. */
export interface PayPalCaptureSummary {
  orderId: string;
  status: string;
}

/** Snapshot of a subscription as PayPal reports it right now. */
export interface PayPalSubscriptionRef {
  id: string;
  status: string;
  planId: string | null;
}

/**
 * Creates a one-time order for the given USD amount. Failures become tagged
 * errors; a 2xx response without an id is its own contract-violation tag.
 */
export const createPayPalOrder = async (
  amount: string,
): Promise<Result<string, PayPalOrderCreateFailed | PayPalOrderIdMissing>> => {
  const created = await Result.tryPromise({
    try: () =>
      ordersController.createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: { currencyCode: "USD", value: amount },
            },
          ],
        },
      }),
    catch: (cause) => {
      console.error("[paypal] createOrder failed", cause);
      return new PayPalOrderCreateFailed({ statusCode: statusOf(cause), cause });
    },
  });

  return created.andThen(({ result }) =>
    result.id ? Result.ok(result.id) : Result.err(new PayPalOrderIdMissing()),
  );
};

/**
 * Captures an approved order. Sends an idempotency key so a retry cannot
 * double-charge, and on failure re-reads the order: if it is already
 * COMPLETED the capture landed upstream and this succeeds — the caller only
 * sees an error when the state genuinely can't be confirmed.
 */
export const capturePayPalOrder = async (
  orderId: string,
): Promise<Result<PayPalCaptureSummary, PayPalOrderCaptureFailed>> => {
  const captured = await Result.tryPromise({
    try: () =>
      ordersController.captureOrder({ id: orderId, paypalRequestId: `paygo-capture-${orderId}` }),
    catch: (cause) => cause,
  });

  if (captured.status === "ok") {
    return Result.ok({
      orderId: captured.value.result.id ?? orderId,
      status: String(captured.value.result.status ?? "COMPLETED"),
    });
  }

  const verified = await Result.tryPromise({
    try: () => ordersController.getOrder({ id: orderId }),
    catch: (cause) => cause,
  });
  if (verified.status === "ok" && String(verified.value.result.status) === "COMPLETED") {
    console.warn(
      `[paypal] captureOrder ${orderId} reported failure but the order is COMPLETED — treating as captured`,
    );
    return Result.ok({ orderId, status: "COMPLETED" });
  }

  console.error(`[paypal] captureOrder ${orderId} failed`, captured.error);
  return Result.err(
    new PayPalOrderCaptureFailed({
      orderId,
      statusCode: statusOf(captured.error),
      cause: captured.error,
    }),
  );
};

/**
 * Creates a Pro subscription against the configured sandbox plan. The buyer
 * approves it through the PayPal SDK; nothing is stored until approval is
 * confirmed via `fetchPayPalSubscription`.
 */
export const createPayPalSubscription = async ({
  userId,
}: {
  userId: string;
}): Promise<Result<string, PayPalSubscriptionCreateFailed | PayPalSubscriptionIdMissing>> => {
  const planId = serverEnv.PAY_PRO_PLAN_ID;
  if (!planId) {
    panic(
      "PAY_PRO_PLAN_ID is not set — create the PayGo Pro sandbox plan and add its id to your environment.",
    );
  }

  const created = await Result.tryPromise({
    try: () =>
      subscriptionsController.createSubscription({
        body: { planId, customId: userId },
        paypalRequestId: `paygo-pro-${userId}-${Date.now()}`,
      }),
    catch: (cause) => {
      console.error("[paypal] createSubscription failed", cause);
      return new PayPalSubscriptionCreateFailed({ statusCode: statusOf(cause), cause });
    },
  });

  return created.andThen(({ result }) =>
    result.id ? Result.ok(result.id) : Result.err(new PayPalSubscriptionIdMissing()),
  );
};

/** Reads the live PayPal state of a subscription. */
export const fetchPayPalSubscription = async (
  id: string,
): Promise<Result<PayPalSubscriptionRef, PayPalSubscriptionSyncFailed>> => {
  const fetched = await Result.tryPromise({
    try: () => subscriptionsController.getSubscription({ id }),
    catch: (cause) => {
      console.error(`[paypal] getSubscription ${id} failed`, cause);
      return new PayPalSubscriptionSyncFailed({
        subscriptionId: id,
        statusCode: statusOf(cause),
        cause,
      });
    },
  });

  return fetched.andThen(({ result }) =>
    result.id
      ? Result.ok({
          id: result.id,
          status: String(result.status ?? "UNKNOWN"),
          planId: result.planId ?? null,
        })
      : Result.err(new PayPalSubscriptionSyncFailed({ subscriptionId: id })),
  );
};
