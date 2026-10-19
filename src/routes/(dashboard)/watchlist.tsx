import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { checkWatchlistPrices } from "@/actions/alerts";
import { getProStatus } from "@/actions/subscription";
import { listWatchlist, removeWatchlistItem } from "@/actions/watchlist";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { alertsRunCodec } from "@/lib/alerts/wire";
import { formatCurrency } from "@/lib/format";
import { pageHead } from "@/lib/seo";
import { PRO_PRICE_LABEL } from "@/lib/subscription/plan";
import { proStatusCodec } from "@/lib/subscription/wire";
import { WatchlistUnauthenticated } from "@/lib/watchlist/errors";
import { watchlistErrorMessage } from "@/lib/watchlist/messages";
import {
  throwOnWatchlistError,
  watchlistListCodec,
  watchlistRemovalCodec,
  type WatchlistEntry,
} from "@/lib/watchlist/wire";

// Locale/timezone pinned so SSR and client render the same string.
const formatAddedAt = (value: Date | string): string =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    value instanceof Date ? value : new Date(value),
  );

const WatchlistPage = () => {
  const { items, pro } = Route.useLoaderData();
  const router = useRouter();
  const removeFn = useServerFn(removeWatchlistItem);
  const checkFn = useServerFn(checkWatchlistPrices);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      const wire = await checkFn();
      const result = await alertsRunCodec.deserializeUnsafe(wire);
      const summary = throwOnWatchlistError(result);
      const failedNote =
        summary.productsFailed > 0 ? ` ${summary.productsFailed} couldn't be checked.` : "";

      if (summary.alertsSent > 0) {
        toast.add({
          title: `Found ${summary.alertsSent} price drop${summary.alertsSent === 1 ? "" : "s"}`,
          description: `We emailed you the details.${failedNote}`,
        });
      } else if (summary.proRequired > 0) {
        toast.add({
          title: `Found ${summary.proRequired} price drop${summary.proRequired === 1 ? "" : "s"}`,
          description: `Email alerts are part of Pro — upgrade to get drops delivered automatically.${failedNote}`,
        });
      } else {
        toast.add({
          title: "No price drops right now",
          description: `Checked ${summary.itemsChecked} ${
            summary.itemsChecked === 1 ? "product" : "products"
          } — nothing below the price you saw.${failedNote}`,
        });
      }
      await router.invalidate();
    } catch (error) {
      toast.add({
        title: "Couldn't check prices",
        description: watchlistErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemove = async (item: WatchlistEntry) => {
    setRemovingId(item.id);
    try {
      const wire = await removeFn({ data: { productId: item.productId } });
      const result = await watchlistRemovalCodec.deserializeUnsafe(wire);
      throwOnWatchlistError(result);
      toast.add({ title: "Removed from your watchlist" });
      await router.invalidate();
    } catch (error) {
      toast.add({
        title: "Couldn't remove the product",
        description: watchlistErrorMessage(error),
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
        <Heart aria-hidden className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Nothing on your watchlist yet</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Find something you're not ready to buy, open its page, and hit "Watch price". PayGo tracks
          the price for you.
        </p>
        <Link to="/search" search={{}} className={buttonVariants({ size: "sm" })}>
          Search products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "product" : "products"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isChecking}
          onClick={() => void handleCheckNow()}
        >
          <RefreshCw aria-hidden className={isChecking ? "animate-spin" : undefined} />
          {isChecking ? "Checking…" : "Check now"}
        </Button>
      </div>

      {pro ? null : (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <Sparkles aria-hidden className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">You're on the free plan</p>
                <p className="text-xs text-muted-foreground">
                  Pro ({PRO_PRICE_LABEL}) adds unlimited watches and emails every price drop
                  automatically.
                </p>
              </div>
            </div>
            <Link to="/pro" className={buttonVariants({ size: "sm" })}>
              See Pro
            </Link>
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Heart aria-hidden className="size-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    to="/product/$id"
                    params={{ id: item.productId }}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.brand ? `${item.brand} · ` : ""}Added {formatAddedAt(item.addedAt)}
                  </p>
                  {item.priceAmount != null && item.priceCurrency ? (
                    <p className="text-sm font-medium">
                      {formatCurrency(item.priceAmount, item.priceCurrency)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">when added</span>
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    to="/product/$id"
                    params={{ id: item.productId }}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    View
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removingId === item.id}
                    onClick={() => void handleRemove(item)}
                  >
                    {removingId === item.id ? "Removing…" : "Remove"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Check now re-reads every watched price and flags drops below what you saw when you added an
        item. Emailing them automatically is part of Pro.
      </p>
    </div>
  );
};

export const Route = createFileRoute("/(dashboard)/watchlist")({
  component: WatchlistPage,
  loader: async () => {
    const wire = await listWatchlist();
    const result = await watchlistListCodec.deserializeUnsafe(wire);

    if (result.status === "error") {
      if (WatchlistUnauthenticated.is(result.error)) {
        throw redirect({ to: "/login", search: { redirect: "/watchlist" } });
      }
      console.error("[watchlist] failed to load", result.error);
      throw result.error;
    }

    const proWire = await getProStatus();
    const proResult = await proStatusCodec.deserializeUnsafe(proWire);

    return { items: result.value, pro: proResult.status === "ok" && proResult.value.pro };
  },
  head: () =>
    pageHead({
      title: "Watchlist — PayGo",
      description: "The products you're tracking, with their live prices and drop history.",
      path: "/watchlist",
      robots: "noindex, nofollow",
    }),
});
