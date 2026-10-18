import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/env/server";
import { runPriceAlerts } from "@/lib/alerts/runner";

/**
 * Whole-table alert run for schedulers (a Render cron job curling this URL, or
 * any external scheduler). Fails closed when no secret is configured; the
 * header carries the secret so it stays out of access logs that record query
 * strings.
 */
const handle = async ({ request }: { request: Request }) => {
  const provided = request.headers.get("x-alerts-secret");
  if (!serverEnv.ALERTS_SECRET || provided !== serverEnv.ALERTS_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runPriceAlerts();
  if (result.status === "error") {
    console.error("[alerts] scheduled run failed", result.error);
    return Response.json({ ok: false, error: result.error._tag }, { status: 500 });
  }

  return Response.json({ ok: true, summary: result.value });
};

export const Route = createFileRoute("/api/alerts/run")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
