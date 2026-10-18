import { isSubscriptionError, type SubscriptionError } from "./errors";
import { isPayPalError } from "@/lib/paypal/errors";
import { paypalErrorMessage } from "@/lib/paypal/messages";

/**
 * Developer-facing context stays on the tagged error; this maps each variant
 * to a user-safe message at the presentation boundary.
 */
export const subscriptionUserMessage = (error: SubscriptionError): string =>
  error.match({
    SubscriptionUnauthenticated: () => "Sign in to manage your subscription.",
    SubscriptionStorageError: () =>
      "Something went wrong with your subscription. Please try again.",
  });

/** User-safe message for any error the Pro flow can surface, including unexpected ones. */
export const proErrorMessage = (error: unknown): string => {
  if (isSubscriptionError(error)) {
    return subscriptionUserMessage(error);
  }
  if (isPayPalError(error)) {
    return paypalErrorMessage(error);
  }
  return "Something went wrong. Please try again.";
};
