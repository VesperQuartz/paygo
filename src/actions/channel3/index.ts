import type { PriceHistoryResponse, SearchFilters } from "@channel3/sdk/resources";
import { Channel3Error as Channel3SdkError } from "@channel3/sdk";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Result } from "better-result";
import z from "zod";
import { auth } from "@/lib/auth";
import { getChannel3 } from "@/lib/channel3";
import { classifyChannel3Failure } from "@/lib/channel3/classify";
import { ProductNotFound, type Channel3Error, type Channel3Operation } from "@/lib/channel3/errors";
import {
  channel3PriceHistoryCodec,
  channel3ProductCodec,
  channel3ProductPageCodec,
  type Channel3PriceHistory,
} from "@/lib/channel3/wire";

const RESULTS_PER_PAGE = 24;

/**
 * Tags Channel3 requests with the signed-in user's id so clicks and sales are
 * attributed back to them in Channel3 reporting (and baked into buy URLs).
 *
 * Best-effort by design: the session lookup needs the auth database, while
 * product search only needs Channel3 — a degraded lookup must not take the
 * search down with it. (Recorded as an intended correction in
 * docs/better-result-adoption.md.)
 */
const userRequestOptions = async () => {
  const session = await auth.api
    .getSession({ headers: getRequestHeaders() })
    .catch((cause: unknown) => {
      console.warn("[channel3] session lookup failed; continuing without user attribution", cause);
      return null;
    });
  if (!session) {
    return undefined;
  }
  return { headers: { "x-user-id": session.user.id } };
};

const logChannel3Failure = (operation: Channel3Operation, cause: unknown) => {
  if (cause instanceof Channel3SdkError) {
    console.error(
      `[channel3] ${operation} failed with HTTP ${cause.statusCode ?? "no status"}`,
      cause.body,
    );
    return;
  }
  console.error(`[channel3] ${operation} failed with an unexpected error`, cause);
};

/**
 * Boundary wrapper: turns the SDK's rejected promise into a Result whose error
 * is one of our tagged errors, and logs the upstream cause server-side.
 */
const callChannel3 = async <TValue>(
  operation: Channel3Operation,
  scope: { productId?: string },
  call: () => Promise<TValue>,
): Promise<Result<TValue, Channel3Error>> =>
  Result.tryPromise({
    try: call,
    catch: (cause) => {
      logChannel3Failure(operation, cause);
      return classifyChannel3Failure(operation, scope.productId ?? null, cause);
    },
  });

const searchInputSchema = z.object({
  query: z.string().default(""),
  imageUrl: z.string().optional(),
  base64Image: z.string().optional(),
  pageToken: z.string().optional(),
  filters: z.unknown().optional(),
  mode: z.enum(["keyword", "default", "agentic"]).optional(),
});

export const searchProducts = createServerFn({ method: "POST" })
  .validator(searchInputSchema)
  .handler(async ({ data }) => {
    const client = getChannel3();
    const options = await userRequestOptions();
    const hasImage = Boolean(data.imageUrl || data.base64Image);
    const operation: Channel3Operation = hasImage ? "searchProductsByImage" : "searchProducts";

    const result = await callChannel3(operation, {}, () =>
      hasImage
        ? client.products.searchByImage(
            {
              image_url: data.imageUrl,
              base64_image: data.base64Image,
              filters: data.filters as SearchFilters | undefined,
              page_token: data.pageToken,
              limit: RESULTS_PER_PAGE,
            },
            options,
          )
        : client.products.search(
            {
              query: data.query,
              filters: data.filters as SearchFilters | undefined,
              page_token: data.pageToken,
              limit: RESULTS_PER_PAGE,
              config: data.mode ? { mode: data.mode } : undefined,
            },
            options,
          ),
    );

    return await channel3ProductPageCodec.serializeUnsafe(
      result.map((page) => ({
        products: page.data,
        nextPageToken: page.response.next_page_token ?? null,
      })),
    );
  });

const similarInputSchema = z.object({
  productId: z.string().min(1),
  limit: z.number().int().min(1).max(30).default(12),
  filters: z.unknown().optional(),
});

export const findSimilarProducts = createServerFn({ method: "POST" })
  .validator(similarInputSchema)
  .handler(async ({ data }) => {
    const client = getChannel3();
    const options = await userRequestOptions();
    const result = await callChannel3("findSimilarProducts", { productId: data.productId }, () =>
      client.products.findSimilar(
        {
          product_id: data.productId,
          filters: data.filters as SearchFilters | undefined,
          limit: data.limit,
        },
        options,
      ),
    );

    return await channel3ProductPageCodec.serializeUnsafe(
      result.map((page) => ({
        products: page.data,
        nextPageToken: page.response.next_page_token ?? null,
      })),
    );
  });

const productInputSchema = z.object({
  productId: z.string().min(1),
  selectedOptions: z.record(z.string(), z.string()).optional(),
});

export const getProduct = createServerFn({ method: "POST" })
  .validator(productInputSchema)
  .handler(async ({ data }) => {
    const client = getChannel3();
    const options = await userRequestOptions();
    const result = await callChannel3("getProduct", { productId: data.productId }, () =>
      client.products.retrieve(
        {
          product_id: data.productId,
          selected_options: data.selectedOptions,
        },
        options,
      ),
    );

    return await channel3ProductCodec.serializeUnsafe(result);
  });

const historyInputSchema = z.object({
  productId: z.string().min(1),
  days: z.number().int().min(1).max(90).default(90),
});

const normalizePriceHistory = (response: PriceHistoryResponse): Channel3PriceHistory => ({
  ...response,
  history: (response.history ?? []).map((point) => ({
    ...point,
    timestamp: new Date(point.timestamp),
  })),
  statistics: response.statistics ?? null,
});

/**
 * 90-day price history plus statistics (mean/min/max and whether the current
 * price is low, typical, or high) — the data behind the buy-now-or-wait verdict.
 */
export const getPriceHistory = createServerFn({ method: "POST" })
  .validator(historyInputSchema)
  .handler(async ({ data }) => {
    const client = getChannel3();
    const options = await userRequestOptions();
    const result = await callChannel3("getPriceHistory", { productId: data.productId }, () =>
      client.priceTracking.retrieveHistory(
        { canonical_product_id: data.productId, days: data.days },
        options,
      ),
    );

    // A product without recorded history (404) is a normal state, not a
    // failure: surface it as an empty history so the PDP hides the section.
    const normalized = result
      .map(normalizePriceHistory)
      .tryRecover((error): Result<Channel3PriceHistory, Channel3Error> =>
        ProductNotFound.is(error)
          ? Result.ok({ canonical_product_id: data.productId, history: [], statistics: null })
          : Result.err(error),
      );

    return await channel3PriceHistoryCodec.serializeUnsafe(normalized);
  });
