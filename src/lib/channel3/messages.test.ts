import { UnhandledException } from "better-result";
import { describe, expect, it } from "vite-plus/test";

import { Channel3RequestRejected, Channel3Unavailable, ProductNotFound } from "./errors";
import { channel3ErrorMessage, channel3UserMessage } from "./messages";

describe("channel3UserMessage", () => {
  it("maps every tagged error to a distinct, non-empty message", () => {
    const messages = [
      channel3UserMessage(
        new Channel3Unavailable({ operation: "searchProducts", statusCode: 503 }),
      ),
      channel3UserMessage(
        new Channel3RequestRejected({ operation: "searchProducts", statusCode: 401 }),
      ),
      channel3UserMessage(new ProductNotFound({ productId: "p1" })),
      channel3UserMessage(new UnhandledException({ cause: undefined })),
    ];

    for (const message of messages) {
      expect(message.length).toBeGreaterThan(10);
    }
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("does not leak developer-facing identifiers", () => {
    const message = channel3UserMessage(new ProductNotFound({ productId: "p1" }));
    expect(message).not.toContain("p1");
  });
});

describe("channel3ErrorMessage", () => {
  it("falls back for errors outside the Channel3 contract", () => {
    const message = channel3ErrorMessage(new Error("internal db failure"));
    expect(message).not.toContain("db");
    expect(message.length).toBeGreaterThan(10);
  });
});
