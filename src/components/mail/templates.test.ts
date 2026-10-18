import { render } from "react-email";
import { describe, expect, it } from "vite-plus/test";

import { formatCurrency } from "@/lib/format";
import { PriceDropAlert, SendVerificationEmail } from "./index";

describe("SendVerificationEmail", () => {
  it("includes the verification link as button href and fallback text", async () => {
    const url = "https://paygo.example.com/verify?token=abc123";
    const html = await render(SendVerificationEmail({ url }));

    expect(html).toContain("Confirm email");
    expect(html).toContain(`href="${url}"`);
    // Plain-text fallback for clients that strip anchors.
    expect((html.match(/abc123/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe("PriceDropAlert", () => {
  it("shows both prices, the product, and the product link", async () => {
    const html = await render(
      PriceDropAlert({
        productTitle: "AirPods Pro 3",
        imageUrl: null,
        productUrl: "https://paygo.example.com/product/c6bFoi2",
        previousPrice: 249.99,
        currentPrice: 199.99,
        currency: "USD",
      }),
    );

    expect(html).toContain("AirPods Pro 3");
    expect(html).toContain(formatCurrency(249.99, "USD"));
    expect(html).toContain(formatCurrency(199.99, "USD"));
    expect(html).toContain("https://paygo.example.com/product/c6bFoi2");
  });

  it("renders a product image when one is available", async () => {
    const html = await render(
      PriceDropAlert({
        productTitle: "AirPods Pro 3",
        imageUrl: "https://cdn.example.com/airpods.png",
        productUrl: "https://paygo.example.com/product/c6bFoi2",
        previousPrice: 249.99,
        currentPrice: 199.99,
        currency: "USD",
      }),
    );

    expect(html).toContain("https://cdn.example.com/airpods.png");
  });
});
