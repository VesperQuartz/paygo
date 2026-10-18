import { createServerFn } from "@tanstack/react-start";
import { runPriceAlerts } from "@/lib/alerts/runner";
import { alertsRunCodec } from "@/lib/alerts/wire";
import { sessionUserId } from "@/lib/auth-session";

/** Runs a price check across the signed-in user's watchlist ("Check now"). */
export const checkWatchlistPrices = createServerFn({ method: "POST" }).handler(async () => {
  const session = await sessionUserId("runPriceAlerts");
  const result = await session.andThenAsync((userId) => runPriceAlerts({ userId }));

  return await alertsRunCodec.serializeUnsafe(result);
});
