import { defineConfig } from "drizzle-kit";
import path from "path";

function getDbUrl(): string {
  if (process.env.SUPABASE_DB_PASSWORD) {
    const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    return `postgresql://postgres.eaiamttynegfkjamombv:${pwd}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error("No database configured. Set SUPABASE_DB_PASSWORD or DATABASE_URL.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
    ssl: !!process.env.SUPABASE_DB_PASSWORD,
  },
});
