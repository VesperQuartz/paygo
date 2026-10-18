import { createServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
import z from "zod";

import { serverEnv } from "@/env/server";
import { subscriptionUserId } from "@/lib/auth-session";
import { PayPalSubscriptionNotActive } from "@/lib/paypal/errors";
import { subscriptionStatusIsActive, toProStatus } from "@/lib/subscription/status";
import { proStatusCodec, subscriptionStartCodec } from "@/lib/subscription/wire";
import { getSubscriptionForUser, upsertSubscription } from "@/repo/subscription.repo";
import { createPayPalSubscription, fetchPayPalSubscription } from "@/services/paypal";

/**
 * Starts a Pro subscription: creates it in PayPal and returns the id the
 * PayPal SDK uses for the buyer approval flow. Nothing is stored yet —
 * approval is confirmed separately.
 */
export const createProSubscription = createServerFn({ method: "POST" }).handler(async () => {
  const session = await subscriptionUserId("createProSubscription");
  const chained = await session.andThenAsync((userId) => createPayPalSubscription({ userId }));
  const result = chained.map((subscriptionId) => ({ subscriptionId }));

  return await subscriptionStartCodec.serializeUnsafe(result);
});

/**
 * Confirms an approval: reads the live PayPal status, stores it when the
 * subscription is ACTIVE, and returns the Pro state. A not-yet-approved
 * subscription reports `PayPalSubscriptionNotActive` instead of being stored.
 */
export const confirmProSubscription = createServerFn({ method: "POST" })
  .validator(z.object({ subscriptionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const session = await subscriptionUserId("confirmProSubscription");
    const result = await session.andThenAsync(async (userId) => {
      const fetched = await fetchPayPalSubscription(data.subscriptionId);
      if (fetched.status === "error") {
        return Result.err(fetched.error);
      }
      if (!subscriptionStatusIsActive(fetched.value.status)) {
        return Result.err(
          new PayPalSubscriptionNotActive({
            subscriptionId: fetched.value.id,
            status: fetched.value.status,
          }),
        );
      }

      const stored = await upsertSubscription({
        userId,
        externalId: fetched.value.id,
        planId: fetched.value.planId ?? serverEnv.PAY_PRO_PLAN_ID ?? "unknown",
        status: fetched.value.status,
      });

      return stored.map((row) => toProStatus(row));
    });

    return await proStatusCodec.serializeUnsafe(result);
  });

/**
 * Re-reads the stored subscription from PayPal on demand — covers approvals
 * that completed after the SDK popup closed, without requiring webhooks.
 */
export const syncProSubscription = createServerFn({ method: "POST" }).handler(async () => {
  const session = await subscriptionUserId("syncProSubscription");
  const result = await session.andThenAsync(async (userId) => {
    const found = await getSubscriptionForUser(userId);
    if (found.status === "error") {
      return Result.err(found.error);
    }
    if (!found.value) {
      return Result.ok(toProStatus(null));
    }

    const fetched = await fetchPayPalSubscription(found.value.externalId);
    if (fetched.status === "error") {
      return Result.err(fetched.error);
    }

    const stored = await upsertSubscription({
      userId,
      externalId: fetched.value.id,
      planId: fetched.value.planId ?? found.value.planId,
      status: fetched.value.status,
    });

    return stored.map((row) => toProStatus(row));
  });

  return await proStatusCodec.serializeUnsafe(result);
});

/** The viewer's Pro state from our own records (no PayPal round trip). */
export const getProStatus = createServerFn({ method: "POST" }).handler(async () => {
  const session = await subscriptionUserId("getProStatus");
  const result = await session.andThenAsync(async (userId) => {
    const found = await getSubscriptionForUser(userId);
    if (found.status === "error") {
      return Result.err(found.error);
    }

    return Result.ok(toProStatus(found.value));
  });

  return await proStatusCodec.serializeUnsafe(result);
});
