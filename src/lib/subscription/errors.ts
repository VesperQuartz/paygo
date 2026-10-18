import { TaggedError } from "better-result";

/** Subscription operations exposed through this app's server functions. */
export const SUBSCRIPTION_OPERATIONS = [
  "createProSubscription",
  "confirmProSubscription",
  "syncProSubscription",
  "getProStatus",
  "getSubscriptionForUser",
  "upsertSubscription",
] as const;

export type SubscriptionOperation = (typeof SUBSCRIPTION_OPERATIONS)[number];

/**
 * The subscription call arrived without a session. Not a storage fault: the
 * user needs to sign in, then the same call can retry unchanged.
 */
export class SubscriptionUnauthenticated extends TaggedError("SubscriptionUnauthenticated")<{
  operation: SubscriptionOperation;
  message: string;
}> {
  constructor(args: { operation: SubscriptionOperation }) {
    super({
      operation: args.operation,
      message: `The ${args.operation} subscription call needs a signed-in user. Show a sign-in path and retry the call after authentication; subscriptions are per-account.`,
    });
  }
}

/**
 * The database rejected a subscription query (connection lost, credentials,
 * schema drift). The cause stays server-side; the user only sees a retry hint.
 */
export class SubscriptionStorageError extends TaggedError("SubscriptionStorageError")<{
  operation: SubscriptionOperation;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { operation: SubscriptionOperation; cause?: unknown }) {
    super({
      operation: args.operation,
      cause: args.cause,
      message: `Subscription storage call "${args.operation}" failed. Inspect the server logs for the database cause; this is an integration problem, not a user error.`,
    });
  }
}

/** Everything the subscription path can report across the server-function boundary. */
export type SubscriptionError = SubscriptionUnauthenticated | SubscriptionStorageError;

export const isSubscriptionError = (value: unknown): value is SubscriptionError =>
  SubscriptionUnauthenticated.is(value) || SubscriptionStorageError.is(value);
