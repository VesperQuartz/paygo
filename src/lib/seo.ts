import type { Product } from "@channel3/sdk/resources";

import { clientEnv } from "@/env/client";
import { formatCurrency } from "@/lib/format";

export const SITE_NAME = "PayGo";

/**
 * Canonical origin for canonical links, OG tags, and JSON-LD. Render sets
 * VITE_BASE_URL to the public URL at build time; local dev falls back to the
 * client-env default.
 */
const siteOrigin = clientEnv.VITE_BASE_URL.replace(/\/+$/, "");

/** Absolute URL for a site-relative path. */
export const siteUrl = (path = "/") => `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;

/** Default social card served from public/og-image.png. */
export const DEFAULT_OG_IMAGE = siteUrl("/og-image.png");

/** Meta descriptions render best around this length; long ones get trimmed. */
const DESCRIPTION_MAX_LENGTH = 160;

/** Trim a description to meta length, cutting on a word boundary where possible. */
const clampDescription = (description: string, max = DESCRIPTION_MAX_LENGTH) => {
  if (description.length <= max) {
    return description;
  }
  const head = description.slice(0, max - 1);
  const lastSpace = head.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? head.slice(0, lastSpace) : head).trimEnd()}…`;
};

/** Absolute image URL — Channel3 serves product images from its own CDN. */
const absoluteImage = (image: string | undefined) => {
  if (!image) {
    return DEFAULT_OG_IMAGE;
  }
  return /^https?:\/\//.test(image) ? image : siteUrl(image);
};

interface PageHeadInput {
  title: string;
  description: string;
  /** Site-relative path used for the canonical URL and og:url. */
  path: string;
  /** Absolute or site-relative social image; defaults to the PayGo card. */
  image?: string;
  /** Open Graph type — "product" on product pages, "website" elsewhere. */
  type?: "website" | "product";
  /** Set on private or thin pages, e.g. "noindex, nofollow". */
  robots?: string;
}

/**
 * Shared `head()` payload for content pages: title, description, canonical
 * link, and Open Graph / Twitter tags. Root-level tags (og:site_name,
 * twitter:card) live in `__root.tsx` and are intentionally not repeated here.
 */
export const pageHead = ({ title, description, path, image, type, robots }: PageHeadInput) => {
  const url = siteUrl(path);
  const socialImage = absoluteImage(image);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...(robots ? [{ name: "robots", content: robots }] : []),
      { property: "og:type", content: type ?? "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: socialImage },
      ...(socialImage === DEFAULT_OG_IMAGE
        ? [
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { property: "og:image:alt", content: "PayGo — never overpay." },
          ]
        : []),
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

/** Inline JSON-LD script descriptor for `head()`. */
export const jsonLdScript = (data: unknown) => ({
  type: "application/ld+json",
  children: JSON.stringify(data),
});

/** WebSite schema with the search action used by richer search results. */
export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: siteUrl("/"),
  description:
    "Search products across every store, compare live offers, and know the exact moment to buy.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: siteUrl("/search?q={search_term_string}"),
    },
    "query-input": "required name=search_term_string",
  },
});

/** Product schema with an aggregate offer built from the live Channel3 offers. */
export const buildProductJsonLd = (product: Product, url: string) => {
  const prices = (product.offers ?? []).map((offer) => offer.price.price);
  const currency = product.offers?.[0]?.price.currency;
  const images = (product.images ?? []).map((image) => image.url).slice(0, 4);
  const brand = product.brands?.[0]?.name;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.description ? { description: product.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(prices.length && currency
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: currency,
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
            url,
          },
        }
      : {}),
  };
};

/** Cheapest live offer, or null when the product has no priced offers. */
const cheapestOffer = (product: Product) => {
  const priced = (product.offers ?? []).filter((offer) => Number.isFinite(offer.price.price));
  return priced.length
    ? priced.reduce((min, offer) => (offer.price.price < min.price.price ? offer : min))
    : null;
};

/**
 * `head()` payload for product pages: a dynamic title/description and price
 * summary from the loader data, the first product image as the social card,
 * and Product JSON-LD. Falls back to a generic page when the loader failed.
 */
export const productHead = (product: Product | undefined, path: string) => {
  if (!product) {
    return pageHead({
      title: "Product — PayGo",
      description:
        "Compare live offers from every store, see the price history, and know the exact moment to buy.",
      path,
    });
  }

  const offers = product.offers ?? [];
  const cheapest = cheapestOffer(product);
  const title = `${product.title} — best price | ${SITE_NAME}`;
  const description = clampDescription(
    cheapest && offers.length
      ? `Compare ${offers.length} live offer${offers.length === 1 ? "" : "s"} from ${formatCurrency(cheapest.price.price, cheapest.price.currency)} across stores — with price history and a buy-or-wait verdict for ${product.title}.`
      : `Live offers from every store, price history, and a buy-or-wait verdict for ${product.title}.`,
  );

  return {
    ...pageHead({
      title,
      description,
      path,
      image: product.images?.[0]?.url,
      type: "product",
    }),
    scripts: [jsonLdScript(buildProductJsonLd(product, siteUrl(path)))],
  };
};
