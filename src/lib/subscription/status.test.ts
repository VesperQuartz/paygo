import { describe, expect, it } from "vite-plus/test";

import { subscriptionStatusIsActive, toProStatus } from "./status";

describe("subscriptionStatusIsActive", () => {
  it("only ACTIVE counts as Pro", () => {
    expect(subscriptionStatusIsActive("ACTIVE")).toBe(true);
    for (const status of [
      "APPROVAL_PENDING",
      "APPROVED",
      "CANCELLED",
      "SUSPENDED",
      "EXPIRED",
      "UNKNOWN",
      null,
      undefined,
    ]) {
      expect(subscriptionStatusIsActive(status)).toBe(false);
    }
  });
});

describe("toProStatus", () => {
  it("maps an active record to Pro", () => {
    expect(toProStatus({ status: "ACTIVE", planId: "P-1" })).toEqual({
      pro: true,
      status: "ACTIVE",
      planId: "P-1",
    });
  });

  it("keeps a pending record visible but not Pro", () => {
    expect(toProStatus({ status: "APPROVAL_PENDING", planId: "P-1" })).toEqual({
      pro: false,
      status: "APPROVAL_PENDING",
      planId: "P-1",
    });
  });

  it("maps no record to a clean free state", () => {
    expect(toProStatus(null)).toEqual({ pro: false, status: null, planId: null });
  });
});
