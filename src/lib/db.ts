import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { serverEnv } from "@/env/server";
import { authRelations } from "@/repo/schema/auth.schema";

// For Node.js - make sure to install the 'ws' and 'bufferutil' packages
//neonConfig.webSocketConstructor = ws;
//

const sql = new Pool({
  connectionString: String(serverEnv.DB_URL),
});

export const db = drizzle({
  client: sql,
  logger: true,
  relations: {
    ...authRelations,
  },
});

export type Db = typeof db;
