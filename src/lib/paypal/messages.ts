import { isPayPalError, type PayPalError } from "./errors";

/**
 * Developer-facing context stays on the tagged error; this maps each variant
 * to a user-safe message at the presentation boundary.
 */
export const paypalUserMessage = (error: PayPalError): string =>
  error.match({
    PayPalOrderCreateFailed: () => "Couldn't start checkout — please try again.",
    PayPalOrderIdMissing: () => "Payment provider returned an unexpected response.",
    PayPalOrderCaptureFailed: () =>
      "We couldn't confirm the payment. Check your PayPal activity before retrying.",
    PayPalSubscriptionCreateFailed: () => "Couldn't start the subscription — please try again.",
    PayPalSubscriptionIdMissing: () => "Payment provider returned an unexpected response.",
    PayPalSubscriptionSyncFailed: () =>
      "We couldn't confirm your subscription. Check your PayPal account before retrying.",
    PayPalSubscriptionNotActive: () =>
      "Your subscription isn't active yet — finish approving it in PayPal, then check again.",
  });

/** User-safe message for any error value, including unexpected ones. */
export const paypalErrorMessage = (error: unknown): string =>
  isPayPalError(error) ? paypalUserMessage(error) : "Something went wrong. Please try again.";
