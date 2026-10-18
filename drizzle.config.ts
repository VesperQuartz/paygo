import { serverEnv } from "@/env/server";
import "@dotenvx/dotenvx/config";
import { defineConfig } from "drizzle-kit";

const dbUrl = new URL(String(serverEnv.DB_URL));
const isLocal = dbUrl.hostname === "localhost" || dbUrl.hostname === "127.0.0.1";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/repo/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: dbUrl.hostname,
    port: dbUrl.port ? Number(dbUrl.port) : undefined,
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, ""),
    // Hosted databases (Render) require TLS; local development databases
    // typically don't speak TLS.
    ssl: isLocal ? false : "require",
  },
});
