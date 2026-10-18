import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Heart } from "lucide-react";
import { useState } from "react";
import { addWatchlistItem, removeWatchlistItem } from "@/actions/watchlist";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { watchlistErrorMessage } from "@/lib/watchlist/messages";
import {
  throwOnWatchlistError,
  watchlistEntryCodec,
  watchlistRemovalCodec,
} from "@/lib/watchlist/wire";

export interface WatchButtonProps {
  productId: string;
  title: string;
  brand?: string | null;
  imageUrl?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  /** Whether the viewer already watches this product (from the route loader). */
  initialWatched: boolean;
  /** Whether the viewer is signed in (from the route loader). */
  signedIn: boolean;
}

/**
 * Add/remove the current product from the viewer's watchlist. Signed-out
 * viewers are routed to sign-in with a redirect back to the current page.
 */
export const WatchButton = ({
  productId,
  title,
  brand = null,
  imageUrl = null,
  priceAmount = null,
  priceCurrency = null,
  initialWatched,
  signedIn,
}: WatchButtonProps) => {
  const navigate = useNavigate();
  const addFn = useServerFn(addWatchlistItem);
  const removeFn = useServerFn(removeWatchlistItem);
  const [watched, setWatched] = useState(initialWatched);
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (!signedIn) {
      void navigate({ to: "/login", search: { redirect: window.location.href } });
      return;
    }

    setIsPending(true);
    try {
      if (watched) {
        const wire = await removeFn({ data: { productId } });
        const result = await watchlistRemovalCodec.deserializeUnsafe(wire);
        throwOnWatchlistError(result);
        setWatched(false);
        toast.add({ title: "Removed from your watchlist" });
      } else {
        const wire = await addFn({
          data: { productId, title, brand, imageUrl, priceAmount, priceCurrency },
        });
        const result = await watchlistEntryCodec.deserializeUnsafe(wire);
        throwOnWatchlistError(result);
        setWatched(true);
        toast.add({
          title: "Saved to your watchlist",
          description:
            "Open Watchlist from the top bar to track it — we'll email you if the price drops.",
        });
      }
    } catch (error) {
      toast.add({
        title: watched ? "Couldn't remove the product" : "Couldn't save the product",
        description: watchlistErrorMessage(error),
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={watched ? "secondary" : "outline"}
      disabled={isPending}
      aria-pressed={watched}
      onClick={() => void handleClick()}
    >
      <Heart aria-hidden className={watched ? "fill-current" : undefined} />
      {watched ? "Watching" : "Watch price"}
    </Button>
  );
};
