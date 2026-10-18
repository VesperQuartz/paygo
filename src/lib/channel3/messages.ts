import { isChannel3Error, type Channel3Error } from "./errors";

/**
 * Developer-facing context stays on the tagged error; this maps each variant
 * to a user-safe message at the presentation boundary.
 */
export const channel3UserMessage = (error: Channel3Error): string =>
  error.match({
    Channel3Unavailable: () =>
      "Product search is having trouble right now — please try again in a moment.",
    Channel3RequestRejected: () =>
      "Something's wrong on our side while loading products. We're looking into it.",
    ProductNotFound: () => "This product isn't available anymore.",
    UnhandledException: () => "Something went wrong while loading products. Please try again.",
  });

/** User-safe message for any error value, including unexpected ones. */
export const channel3ErrorMessage = (error: unknown): string =>
  isChannel3Error(error) ? channel3UserMessage(error) : "Something went wrong. Please try again.";
