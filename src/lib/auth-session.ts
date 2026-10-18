import { Result } from "better-result";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
  SubscriptionStorageError,
  SubscriptionUnauthenticated,
  type SubscriptionError,
  type SubscriptionOperation,
} from "@/lib/subscription/errors";
import {
  WatchlistStorageError,
  WatchlistUnauthenticated,
  type WatchlistError,
  type WatchlistOperation,
} from "@/lib/watchlist/errors";

/**
 * Resolve the signed-in user id for a server function. A session-store failure
 * surfaces as a storage error (not "signed out") so the UI can tell the two
 * apart and the caller can decide whether to retry or prompt for sign-in.
 */
const resolveUserId = async <TOperation extends string, TError>(
  logLabel: string,
  operation: TOperation,
  handlers: {
    unauthenticated: (operation: TOperation) => TError;
    storage: (operation: TOperation, cause: unknown) => TError;
  },
): Promise<Result<string, TError>> => {
  try {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    return session ? Result.ok(session.user.id) : Result.err(handlers.unauthenticated(operation));
  } catch (cause) {
    console.error(`${logLabel} ${operation} session lookup failed`, cause);
    return Result.err(handlers.storage(operation, cause));
  }
};

export const sessionUserId = (
  operation: WatchlistOperation,
): Promise<Result<string, WatchlistError>> =>
  resolveUserId<WatchlistOperation, WatchlistError>("[watchlist]", operation, {
    unauthenticated: (op) => new WatchlistUnauthenticated({ operation: op }),
    storage: (op, cause) => new WatchlistStorageError({ operation: op, cause }),
  });

export const subscriptionUserId = (
  operation: SubscriptionOperation,
): Promise<Result<string, SubscriptionError>> =>
  resolveUserId<SubscriptionOperation, SubscriptionError>("[subscription]", operation, {
    unauthenticated: (op) => new SubscriptionUnauthenticated({ operation: op }),
    storage: (op, cause) => new SubscriptionStorageError({ operation: op, cause }),
  });
