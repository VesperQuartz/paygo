import { describe, expect, it } from "vite-plus/test";

import { shouldAlertOnDrop } from "./drop";

describe("shouldAlertOnDrop", () => {
  it("alerts when the live price beats the baseline", () => {
    expect(
      shouldAlertOnDrop({ currentPrice: 199.99, baselinePrice: 249.99, lastAlertedPrice: null }),
    ).toBe(true);
  });

  it("does not alert at or above the baseline", () => {
    expect(
      shouldAlertOnDrop({ currentPrice: 249.99, baselinePrice: 249.99, lastAlertedPrice: null }),
    ).toBe(false);
    expect(
      shouldAlertOnDrop({ currentPrice: 259.99, baselinePrice: 249.99, lastAlertedPrice: null }),
    ).toBe(false);
  });

  it("never alerts without a known baseline price", () => {
    expect(
      shouldAlertOnDrop({ currentPrice: 10, baselinePrice: null, lastAlertedPrice: null }),
    ).toBe(false);
  });

  it("re-alerts only below the last alerted price", () => {
    expect(
      shouldAlertOnDrop({ currentPrice: 179.99, baselinePrice: 249.99, lastAlertedPrice: 189.99 }),
    ).toBe(true);
    expect(
      shouldAlertOnDrop({ currentPrice: 189.99, baselinePrice: 249.99, lastAlertedPrice: 189.99 }),
    ).toBe(false);
    expect(
      shouldAlertOnDrop({ currentPrice: 199.99, baselinePrice: 249.99, lastAlertedPrice: 189.99 }),
    ).toBe(false);
  });
});
