import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function createPool() {
  // Supabase: use component-based config to avoid URL-encoding issues with passwords
  if (process.env.SUPABASE_DB_PASSWORD) {
    return new Pool({
      host: "aws-0-ap-northeast-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: "postgres.eaiamttynegfkjamombv",
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    });
  }

  // Fallback: Replit built-in PostgreSQL
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No database configured. Set SUPABASE_DB_PASSWORD or DATABASE_URL.");
  return new Pool({ connectionString: url });
}

export const pool = createPool();
export const db = drizzle(pool, { schema });

export * from "./schema";
