import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const adminUser = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const adminPassword =
  process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
const directUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

const hasDiscreteCredentials = Boolean(
  sqlHost && sqlDbName && adminUser && adminPassword,
);

if (!hasDiscreteCredentials && !directUrl) {
  throw new Error(
    "Database credentials missing: set either Cloud SQL variables (SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD) or a standard PostgreSQL/Supabase URL (DIRECT_URL or DATABASE_URL).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: hasDiscreteCredentials
    ? {
        host: sqlHost!,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
        user: adminUser!,
        password: adminPassword!,
        database: sqlDbName!,
        ssl: false,
      }
    : {
        url: directUrl!,
      },
  verbose: true,
});
