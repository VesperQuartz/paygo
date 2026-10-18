import { describe, expect, it } from "vite-plus/test";

import { parseSearchRouteParams } from "./search-params";

describe("parseSearchRouteParams", () => {
  it("keeps a non-empty query", () => {
    const params = parseSearchRouteParams({ q: "airpods" });

    expect(params.q).toBe("airpods");
  });

  it("drops empty and non-string queries", () => {
    expect(parseSearchRouteParams({ q: "" }).q).toBeUndefined();
    expect(parseSearchRouteParams({ q: 1 }).q).toBeUndefined();
    expect(parseSearchRouteParams({ q: true }).q).toBeUndefined();
  });

  it("always returns q so the router can clear a raw value", () => {
    expect("q" in parseSearchRouteParams({ q: 1 })).toBe(true);
    expect("q" in parseSearchRouteParams({})).toBe(true);
  });

  it("accepts every truthy deep-search encoding", () => {
    expect(parseSearchRouteParams({ deep: true }).deep).toBe(true);
    expect(parseSearchRouteParams({ deep: 1 }).deep).toBe(true);
    expect(parseSearchRouteParams({ deep: "1" }).deep).toBe(true);
    expect(parseSearchRouteParams({ deep: "true" }).deep).toBe(true);
  });

  it("drops other deep-search values", () => {
    expect(parseSearchRouteParams({}).deep).toBeUndefined();
    expect(parseSearchRouteParams({ deep: false }).deep).toBeUndefined();
    expect(parseSearchRouteParams({ deep: "yes" }).deep).toBeUndefined();
  });

  it("always returns deep so the router can clear a raw value", () => {
    expect("deep" in parseSearchRouteParams({ deep: "yes" })).toBe(true);
  });
});
