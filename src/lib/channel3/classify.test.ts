import { Channel3Error as Channel3SdkError, Channel3TimeoutError } from "@channel3/sdk";
import { UnhandledException } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import { classifyChannel3Failure } from "./classify";
import {
  Channel3RequestRejected,
  Channel3Unavailable,
  ProductNotFound,
  type Channel3Error,
} from "./errors";

const asChannel3Unavailable = (value: Channel3Error): Channel3Unavailable => {
  if (!Channel3Unavailable.is(value)) {
    throw new Error("expected Channel3Unavailable");
  }
  return value;
};

const asChannel3RequestRejected = (value: Channel3Error): Channel3RequestRejected => {
  if (!Channel3RequestRejected.is(value)) {
    throw new Error("expected Channel3RequestRejected");
  }
  return value;
};

const asProductNotFound = (value: Channel3Error): ProductNotFound => {
  if (!ProductNotFound.is(value)) {
    throw new Error("expected ProductNotFound");
  }
  return value;
};

const asUnhandledException = (value: Channel3Error): UnhandledException => {
  if (!UnhandledException.is(value)) {
    throw new Error("expected UnhandledException");
  }
  return value;
};

describe("classifyChannel3Failure", () => {
  it("maps SDK timeouts to Channel3Unavailable without a status code", () => {
    const error = asChannel3Unavailable(
      classifyChannel3Failure("searchProducts", null, new Channel3TimeoutError("timed out")),
    );

    expect(error.operation).toBe("searchProducts");
    expect(error.statusCode).toBeNull();
  });

  it("maps 5xx responses to Channel3Unavailable and keeps the cause", () => {
    const cause = new Channel3SdkError({ statusCode: 503 });
    const error = asChannel3Unavailable(
      classifyChannel3Failure("findSimilarProducts", null, cause),
    );

    expect(error.statusCode).toBe(503);
    expect(error.cause).toBe(cause);
  });

  it("maps throttling (429) to Channel3Unavailable", () => {
    const error = asChannel3Unavailable(
      classifyChannel3Failure("getProduct", "p1", new Channel3SdkError({ statusCode: 429 })),
    );

    expect(error.statusCode).toBe(429);
  });

  it("maps responses without a status code to Channel3Unavailable", () => {
    const error = asChannel3Unavailable(
      classifyChannel3Failure("searchProducts", null, new Channel3SdkError({})),
    );

    expect(error.statusCode).toBeNull();
  });

  it("maps auth, plan, and validation rejections to Channel3RequestRejected", () => {
    for (const statusCode of [400, 401, 402, 403, 409, 422]) {
      const error = asChannel3RequestRejected(
        classifyChannel3Failure("getPriceHistory", "p1", new Channel3SdkError({ statusCode })),
      );

      expect(error.statusCode).toBe(statusCode);
    }
  });

  it("maps 404 to ProductNotFound when a product id is in scope", () => {
    const error = asProductNotFound(
      classifyChannel3Failure("getProduct", "p9", new Channel3SdkError({ statusCode: 404 })),
    );

    expect(error.productId).toBe("p9");
  });

  it("maps 404 without a product id to Channel3RequestRejected", () => {
    const error = asChannel3RequestRejected(
      classifyChannel3Failure("searchProducts", null, new Channel3SdkError({ statusCode: 404 })),
    );

    expect(error.statusCode).toBe(404);
  });

  it("maps failures outside the SDK contract to UnhandledException", () => {
    const cause = new TypeError("network blew up");
    const error = asUnhandledException(classifyChannel3Failure("searchProducts", null, cause));

    expect(error.cause).toBe(cause);
  });

  it("keeps developer-facing context in the message", () => {
    const error = asChannel3Unavailable(
      classifyChannel3Failure("searchProductsByImage", null, new Channel3TimeoutError("t")),
    );

    expect(error.message).toContain("searchProductsByImage");
  });
});
