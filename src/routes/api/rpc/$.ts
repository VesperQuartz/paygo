import "@/polyfill";

import { CompressionPlugin, RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, CORSPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import { getCookies } from "@tanstack/react-start/server";
import router from "@/lib/orpc/router";

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin({
      origin: (origin, _options) => origin,
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    }),
    new BatchHandlerPlugin(),
    new CompressionPlugin(),
  ],
});

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {
      headers: request.headers,
      cookies: getCookies(),
    },
  });

  return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
