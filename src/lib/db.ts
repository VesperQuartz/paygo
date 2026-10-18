import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/env/server";
import { authRelations } from "@/repo/schema/auth.schema";

const connectionString = String(serverEnv.DB_URL);

// Render Postgres (and other hosted databases) require TLS for external
// connections; local development databases typically don't speak TLS.
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const sql = new Pool({
  connectionString,
  ssl: isLocal ? false : true,
});

export const db = drizzle({
  client: sql,
  logger: true,
  relations: {
    ...authRelations,
  },
});

export type Db = typeof db;
