import { PayPalSubscriptionButton } from "@paypal/react-paypal-js/sdk-v6";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  confirmProSubscription,
  createProSubscription,
  getProStatus,
  syncProSubscription,
} from "@/actions/subscription";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { PayPalSubscriptionNotActive } from "@/lib/paypal/errors";
import { SubscriptionUnauthenticated } from "@/lib/subscription/errors";
import { proErrorMessage } from "@/lib/subscription/messages";
import { FREE_WATCHLIST_LIMIT, PRO_PRICE_LABEL } from "@/lib/subscription/plan";
import { proStatusCodec, subscriptionStartCodec } from "@/lib/subscription/wire";

const freePerks = [
  "Unlimited product search + verdicts",
  `Watch up to ${FREE_WATCHLIST_LIMIT} products`,
  "Manual price checks",
];

const proPerks = [
  "Everything in Free",
  "Unlimited watched products",
  "Automatic price-drop emails",
  "New features first",
];

const PerkList = ({ perks, muted }: { perks: string[]; muted?: boolean }) => (
  <ul className="flex flex-col gap-2">
    {perks.map((perk) => (
      <li key={perk} className="flex items-start gap-2 text-sm">
        <Check
          aria-hidden
          className={
            muted
              ? "mt-0.5 size-4 shrink-0 text-muted-foreground"
              : "mt-0.5 size-4 shrink-0 text-primary"
          }
        />
        <span>{perk}</span>
      </li>
    ))}
  </ul>
);

const ProPage = () => {
  const { signedIn, pro, status } = Route.useLoaderData();
  const router = useRouter();
  const createFn = useServerFn(createProSubscription);
  const confirmFn = useServerFn(confirmProSubscription);
  const syncFn = useServerFn(syncProSubscription);
  const [isSyncing, setIsSyncing] = useState(false);

  /** Starts the subscription server-side and hands its id to the PayPal SDK. */
  const handleCreateSubscription = async () => {
    const result = await subscriptionStartCodec.deserializeUnsafe(await createFn());
    if (result.status === "error") {
      toast.add({
        title: "Couldn't start the subscription",
        description: proErrorMessage(result.error),
      });
      // Abort the PayPal flow instead of letting the SDK surface a raw error.
      throw result.error;
    }

    return { subscriptionId: result.value.subscriptionId };
  };

  /** Runs once the buyer finishes approval inside the PayPal window. */
  const handleApprove = async ({ subscriptionId }: { subscriptionId: string }) => {
    const result = await proStatusCodec.deserializeUnsafe(
      await confirmFn({ data: { subscriptionId } }),
    );

    if (result.status === "error") {
      toast.add({
        title: PayPalSubscriptionNotActive.is(result.error)
          ? "Approval still pending"
          : "Subscription not confirmed",
        description: proErrorMessage(result.error),
      });
      return;
    }

    toast.add({
      title: "You're on Pro",
      description: "Unlimited watches and automatic price-drop emails are on.",
    });
    await router.invalidate();
  };

  /** Re-reads the stored subscription from PayPal (for approvals that raced the popup). */
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await proStatusCodec.deserializeUnsafe(await syncFn());
      if (result.status === "error") {
        toast.add({
          title: "Couldn't refresh the status",
          description: proErrorMessage(result.error),
        });
        return;
      }

      toast.add(
        result.value.pro
          ? { title: "You're on Pro", description: "The subscription is active." }
          : {
              title: "Not active yet",
              description: `PayPal reports "${result.value.status ?? "no subscription"}".`,
            },
      );
      await router.invalidate();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">PayGo Pro</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Stop re-checking prices yourself. Pro watches every product for you and emails the moment
          one drops below the price you saw.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Free</CardTitle>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">$0</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PerkList perks={freePerks} muted />
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pro</CardTitle>
              <Sparkles aria-hidden className="size-4 text-primary" />
            </div>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">{PRO_PRICE_LABEL}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <PerkList perks={proPerks} />

            {pro ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-primary">You're on Pro — alerts are on.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  onClick={() => void handleSync()}
                >
                  {isSyncing ? "Refreshing…" : "Refresh status"}
                </Button>
              </div>
            ) : signedIn ? (
              <div className="flex flex-col gap-3">
                <PayPalSubscriptionButton
                  presentationMode="modal"
                  createSubscription={handleCreateSubscription}
                  onApprove={handleApprove}
                />
                {status ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                    onClick={() => void handleSync()}
                  >
                    {isSyncing ? "Refreshing…" : `Check status (PayPal reports "${status}")`}
                  </Button>
                ) : null}
              </div>
            ) : (
              <Link
                to="/login"
                search={{ redirect: "/pro" }}
                className={buttonVariants({ size: "sm" })}
              >
                Sign in to go Pro
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Subscriptions run through PayPal (sandbox). Manage or cancel anytime from your PayPal
        account.
      </p>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/pro")({
  component: ProPage,
  loader: async () => {
    const wire = await getProStatus();
    const result = await proStatusCodec.deserializeUnsafe(wire);

    if (result.status === "error") {
      if (SubscriptionUnauthenticated.is(result.error)) {
        return { signedIn: false, pro: false, status: null };
      }
      console.error("[subscription] failed to load Pro status", result.error);
      throw result.error;
    }

    return { signedIn: true, pro: result.value.pro, status: result.value.status };
  },
  head: () => ({
    meta: [{ title: "Pro — PayGo" }],
  }),
});
