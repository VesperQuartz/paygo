/**
 * Cron entry point for the daily price check on Render: dispatches the root
 * `runPriceAlerts` task on the `paygo-alerts` workflow service via the Render
 * API, then logs the new task run's id. Requires `RENDER_API_KEY`; override the
 * task slug with `TASK_SLUG` if the workflow service is renamed.
 */
const taskSlug = process.env.TASK_SLUG ?? "paygo-alerts/runPriceAlerts";
const apiKey = process.env.RENDER_API_KEY;

if (!apiKey) {
  console.error("[alert-trigger] RENDER_API_KEY is not set — nothing dispatched");
  process.exit(1);
}

const response = await fetch("https://api.render.com/v1/task-runs", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ task: taskSlug, input: [] }),
  signal: AbortSignal.timeout(30_000),
});

const body = await response.text();

if (!response.ok) {
  console.error(`[alert-trigger] dispatch failed (${response.status}): ${body}`);
  process.exit(1);
}

const dispatched = JSON.parse(body) as { id?: string };
console.log(`[alert-trigger] dispatched ${taskSlug} as ${dispatched.id ?? "(no id in response)"}`);

export {};
