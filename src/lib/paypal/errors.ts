import { TaggedError } from "better-result";

// Note: the HTTP status is passed in by the service layer (which can inspect
// the SDK's ApiError); this module stays dependency-free so it is safe to
// import from client bundles.

export class PayPalOrderCreateFailed extends TaggedError("PayPalOrderCreateFailed")<{
  statusCode?: number;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { statusCode?: number; cause?: unknown }) {
    super({
      statusCode: args.statusCode,
      cause: args.cause,
      message: `PayPal createOrder failed${args.statusCode ? ` (status ${args.statusCode})` : ""}. The upstream cause is attached; this is an integration or credentials problem.`,
    });
  }
}

export class PayPalOrderIdMissing extends TaggedError("PayPalOrderIdMissing")<{
  message: string;
}> {
  constructor() {
    super({
      message:
        "PayPal createOrder returned a 2xx response without an order id — upstream contract violation.",
    });
  }
}

export class PayPalOrderCaptureFailed extends TaggedError("PayPalOrderCaptureFailed")<{
  orderId: string;
  statusCode?: number;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { orderId: string; statusCode?: number; cause?: unknown }) {
    super({
      orderId: args.orderId,
      statusCode: args.statusCode,
      cause: args.cause,
      message: `PayPal captureOrder ${args.orderId} failed${args.statusCode ? ` (status ${args.statusCode})` : ""} and the order state could not be verified as captured. Check the capture state in PayPal before retrying — the charge may have gone through.`,
    });
  }
}

export class PayPalSubscriptionCreateFailed extends TaggedError("PayPalSubscriptionCreateFailed")<{
  statusCode?: number;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { statusCode?: number; cause?: unknown }) {
    super({
      statusCode: args.statusCode,
      cause: args.cause,
      message: `PayPal createSubscription failed${args.statusCode ? ` (status ${args.statusCode})` : ""}. The upstream cause is attached; this is an integration or credentials problem.`,
    });
  }
}

export class PayPalSubscriptionIdMissing extends TaggedError("PayPalSubscriptionIdMissing")<{
  message: string;
}> {
  constructor() {
    super({
      message:
        "PayPal createSubscription returned a 2xx response without a subscription id — upstream contract violation.",
    });
  }
}

export class PayPalSubscriptionSyncFailed extends TaggedError("PayPalSubscriptionSyncFailed")<{
  subscriptionId: string;
  statusCode?: number;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { subscriptionId: string; statusCode?: number; cause?: unknown }) {
    super({
      subscriptionId: args.subscriptionId,
      statusCode: args.statusCode,
      cause: args.cause,
      message: `PayPal getSubscription ${args.subscriptionId} failed${args.statusCode ? ` (status ${args.statusCode})` : ""}. The subscription may still exist — verify in PayPal before retrying.`,
    });
  }
}

export class PayPalSubscriptionNotActive extends TaggedError("PayPalSubscriptionNotActive")<{
  subscriptionId: string;
  status: string;
  message: string;
}> {
  constructor(args: { subscriptionId: string; status: string }) {
    super({
      subscriptionId: args.subscriptionId,
      status: args.status,
      message: `Subscription ${args.subscriptionId} is "${args.status}", not ACTIVE — the buyer has not finished approving it in PayPal yet.`,
    });
  }
}

export type PayPalOrderError =
  | PayPalOrderCreateFailed
  | PayPalOrderIdMissing
  | PayPalOrderCaptureFailed;

export type PayPalSubscriptionError =
  | PayPalSubscriptionCreateFailed
  | PayPalSubscriptionIdMissing
  | PayPalSubscriptionSyncFailed
  | PayPalSubscriptionNotActive;

export type PayPalError = PayPalOrderError | PayPalSubscriptionError;

export const isPayPalError = (value: unknown): value is PayPalError =>
  PayPalOrderCreateFailed.is(value) ||
  PayPalOrderIdMissing.is(value) ||
  PayPalOrderCaptureFailed.is(value) ||
  PayPalSubscriptionCreateFailed.is(value) ||
  PayPalSubscriptionIdMissing.is(value) ||
  PayPalSubscriptionSyncFailed.is(value) ||
  PayPalSubscriptionNotActive.is(value);
