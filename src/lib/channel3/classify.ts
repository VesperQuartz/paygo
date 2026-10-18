import { Channel3Error as Channel3SdkError } from "@channel3/sdk";
import { UnhandledException } from "better-result";

import {
  Channel3RequestRejected,
  Channel3Unavailable,
  ProductNotFound,
  type Channel3Error,
  type Channel3Operation,
} from "./errors";

/** Rejections that retrying, without changing configuration, cannot fix. */
const REJECTED_STATUSES = new Set([400, 401, 402, 403, 409, 422]);

/**
 * Maps a thrown Channel3 SDK failure onto the app's tagged error contract.
 * Timeouts, throttling (429), 5xx, and other transport failures collapse into
 * Channel3Unavailable; documented client errors become Channel3RequestRejected;
 * 404 becomes ProductNotFound when a product id is in scope. Anything outside
 * the SDK's documented error classes is temporarily surfaced as
 * UnhandledException so it stays visible in the adoption report.
 */
export const classifyChannel3Failure = (
  operation: Channel3Operation,
  productId: string | null,
  cause: unknown,
): Channel3Error => {
  if (!(cause instanceof Channel3SdkError)) {
    return new UnhandledException({ cause });
  }

  const statusCode = cause.statusCode ?? null;

  if (statusCode === 404) {
    return productId !== null
      ? new ProductNotFound({ productId, cause })
      : new Channel3RequestRejected({ operation, statusCode, cause });
  }

  if (statusCode !== null && REJECTED_STATUSES.has(statusCode)) {
    return new Channel3RequestRejected({ operation, statusCode, cause });
  }

  return new Channel3Unavailable({ operation, statusCode, cause });
};
