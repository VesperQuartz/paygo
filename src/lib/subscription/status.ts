import type { ProStatus } from "./wire";

export const ACTIVE_SUBSCRIPTION_STATUS = "ACTIVE";

export const subscriptionStatusIsActive = (status: string | null | undefined): boolean =>
  status === ACTIVE_SUBSCRIPTION_STATUS;

/** Maps the stored subscription row (or the absence of one) to the client-facing Pro state. */
export const toProStatus = (record: { status: string; planId: string } | null): ProStatus => ({
  pro: subscriptionStatusIsActive(record?.status),
  status: record?.status ?? null,
  planId: record?.planId ?? null,
});
