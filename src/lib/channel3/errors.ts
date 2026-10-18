import { TaggedError, UnhandledException } from "better-result";

/** Channel3 read operations exposed through this app's server functions. */
export const CHANNEL3_OPERATIONS = [
  "searchProducts",
  "searchProductsByImage",
  "findSimilarProducts",
  "getProduct",
  "getPriceHistory",
] as const;

export type Channel3Operation = (typeof CHANNEL3_OPERATIONS)[number];

/**
 * A Channel3 request failed at the transport level or upstream is unhealthy
 * (timeouts, throttling, 5xx). Callers can retry with backoff.
 */
export class Channel3Unavailable extends TaggedError("Channel3Unavailable")<{
  operation: Channel3Operation;
  statusCode: number | null;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { operation: Channel3Operation; statusCode?: number | null; cause?: unknown }) {
    super({
      operation: args.operation,
      statusCode: args.statusCode ?? null,
      cause: args.cause,
      message: `Channel3 ${args.operation} call failed${
        args.statusCode != null
          ? ` with HTTP ${args.statusCode}`
          : " before a response was received"
      }. The upstream service may be throttling or temporarily down; retry with backoff and check the Channel3 status page if failures persist.`,
    });
  }
}

/**
 * Channel3 rejected the request (auth, plan, validation, bad input). Retrying
 * without fixing the integration cannot help; the operator must intervene.
 */
export class Channel3RequestRejected extends TaggedError("Channel3RequestRejected")<{
  operation: Channel3Operation;
  statusCode: number;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { operation: Channel3Operation; statusCode: number; cause?: unknown }) {
    super({
      operation: args.operation,
      statusCode: args.statusCode,
      cause: args.cause,
      message: `Channel3 rejected the ${args.operation} call with HTTP ${args.statusCode}. This indicates a configuration, credentials, or plan problem rather than a temporary outage; inspect the response body in the server logs and fix the integration before retrying.`,
    });
  }
}

/** Channel3 has no product for the requested id (delisted, or a stale link). */
export class ProductNotFound extends TaggedError("ProductNotFound")<{
  productId: string;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { productId: string; cause?: unknown }) {
    super({
      productId: args.productId,
      cause: args.cause,
      message: `Channel3 has no product with id "${args.productId}". It may have been delisted or the link is stale; show a not-found state and route the shopper back to search.`,
    });
  }
}

/**
 * Everything the Channel3 read path can report across the server-function
 * boundary. UnhandledException is the temporary fallback for failures outside
 * the SDK's documented error classes (tracked in docs/better-result-adoption.md).
 */
export type Channel3Error =
  | Channel3Unavailable
  | Channel3RequestRejected
  | ProductNotFound
  | UnhandledException;

export const isChannel3Error = (value: unknown): value is Channel3Error =>
  Channel3Unavailable.is(value) ||
  Channel3RequestRejected.is(value) ||
  ProductNotFound.is(value) ||
  UnhandledException.is(value);
