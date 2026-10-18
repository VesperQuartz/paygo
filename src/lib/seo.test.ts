import type { Product } from "@channel3/sdk/resources";
import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_OG_IMAGE, pageHead, productHead, siteUrl } from "./seo";

const origin = siteUrl("/").replace(/\/$/, "");

const metaOf = (head: { meta: readonly unknown[] }) => head.meta as Array<Record<string, string>>;

const metaContent = (head: { meta: readonly unknown[] }, key: "name" | "property", name: string) =>
  metaOf(head).find((entry) => entry[key] === name)?.content;

const scriptData = (head: unknown) => {
  const scripts = (head as { scripts?: Array<{ children: string }> }).scripts;
  return JSON.parse(scripts?.[0]?.children ?? "{}") as Record<string, unknown>;
};

const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  title: "AirPods Pro 3",
  brands: [{ id: "brand-1", name: "Apple" }],
  images: [{ url: "https://cdn.channel3.example/airpods.jpg" }],
  offers: [
    {
      url: "https://a.example/p",
      domain: "a.example",
      price: { price: 199.99, currency: "USD" },
      availability: "InStock",
    },
    {
      url: "https://b.example/p",
      domain: "b.example",
      price: { price: 249.5, currency: "USD" },
      availability: "InStock",
    },
  ],
  ...overrides,
});

describe("siteUrl", () => {
  it("builds absolute URLs with or without a leading slash", () => {
    expect(siteUrl("/pro")).toBe(`${origin}/pro`);
    expect(siteUrl("pro")).toBe(`${origin}/pro`);
  });

  it("defaults to the site root", () => {
    expect(siteUrl()).toBe(`${origin}/`);
  });
});

describe("pageHead", () => {
  const head = pageHead({
    title: "Pro — PayGo",
    description: "Track unlimited products.",
    path: "/pro",
  });

  it("emits the title and description", () => {
    expect(metaOf(head).some((entry) => entry.title === "Pro — PayGo")).toBe(true);
    expect(metaContent(head, "name", "description")).toBe("Track unlimited products.");
  });

  it("points og:url and the canonical link at the page path", () => {
    expect(metaContent(head, "property", "og:url")).toBe(siteUrl("/pro"));
    expect(head.links).toEqual([{ rel: "canonical", href: siteUrl("/pro") }]);
  });

  it("falls back to the default social card with dimensions", () => {
    expect(metaContent(head, "property", "og:image")).toBe(DEFAULT_OG_IMAGE);
    expect(metaContent(head, "property", "og:image:width")).toBe("1200");
    expect(metaContent(head, "property", "og:image:height")).toBe("630");
  });

  it("omits robots unless asked", () => {
    expect(metaContent(head, "name", "robots")).toBeUndefined();
    const privateHead = pageHead({
      title: "Watchlist — PayGo",
      description: "Your watched products.",
      path: "/watchlist",
      robots: "noindex, nofollow",
    });
    expect(metaContent(privateHead, "name", "robots")).toBe("noindex, nofollow");
  });

  it("uses a custom image without card dimensions", () => {
    const productPage = pageHead({
      title: "Widget — best price | PayGo",
      description: "Compare live offers.",
      path: "/product/p1",
      image: "https://cdn.channel3.example/widget.jpg",
      type: "product",
    });
    expect(metaContent(productPage, "property", "og:image")).toBe(
      "https://cdn.channel3.example/widget.jpg",
    );
    expect(metaContent(productPage, "property", "og:image:width")).toBeUndefined();
    expect(metaContent(productPage, "property", "og:type")).toBe("product");
  });
});

describe("productHead", () => {
  it("falls back to a generic page without loader data", () => {
    const head = productHead(undefined, "/product/p1");
    expect(metaOf(head).some((entry) => entry.title === "Product — PayGo")).toBe(true);
    expect(head.links).toEqual([{ rel: "canonical", href: siteUrl("/product/p1") }]);
    expect("scripts" in head).toBe(false);
  });

  it("builds a dynamic title, price description, and Product JSON-LD", () => {
    const head = productHead(product(), "/product/p1");

    expect(metaOf(head).some((entry) => entry.title === "AirPods Pro 3 — best price | PayGo")).toBe(
      true,
    );
    expect(metaContent(head, "name", "description")).toContain("$199.99");
    expect(metaContent(head, "property", "og:image")).toBe(
      "https://cdn.channel3.example/airpods.jpg",
    );

    const data = scriptData(head);
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("AirPods Pro 3");
    expect(data.brand).toEqual({ "@type": "Brand", name: "Apple" });
    expect(data.image).toEqual(["https://cdn.channel3.example/airpods.jpg"]);
    expect(data.offers).toEqual({
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: 199.99,
      highPrice: 249.5,
      offerCount: 2,
      url: siteUrl("/product/p1"),
    });
  });

  it("omits the aggregate offer when no prices are available", () => {
    const head = productHead(product({ offers: [] }), "/product/p1");
    const data = scriptData(head);
    expect(data.offers).toBeUndefined();
    expect(metaContent(head, "name", "description")).toContain("AirPods Pro 3");
  });

  it("clamps very long descriptions to meta length", () => {
    const longTitle = "Wireless Noise Cancelling Over-Ear Headphones With Spatial Audio ".repeat(3);
    const head = productHead(product({ title: longTitle }), "/product/p1");
    const description = metaContent(head, "name", "description") ?? "";
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith("…")).toBe(true);
  });
});
