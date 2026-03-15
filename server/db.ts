import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const connectionString =
  process.env.DATABASE_FALLBACK_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

export { pool };
export const db = drizzle(pool);
