import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema.js";

declare global {
  var _postgresPool: Pool | undefined;
}

function shouldUseSsl(connectionString: string): boolean {
  if (process.env.PGSSLMODE === "disable") return false;
  if (process.env.PGSSLMODE === "require") return true;
  if (/sslmode=(require|verify-ca|verify-full)/i.test(connectionString)) {
    return true;
  }
  const isLocal =
    /@(localhost|127\.0\.0\.1|\[::1\])(?::|\/)/i.test(connectionString);
  return !isLocal;
}

function buildPoolConfig(): PoolConfig {
  // 1. Prefer Cloud SQL discrete variables (Unix socket or TCP host) when set
  if (process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER) {
    return {
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    };
  }

  // 2. Fallback to standard PostgreSQL / Supabase connection URL
  const connectionString =
    process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
  if (connectionString) {
    return {
      connectionString,
      ssl: shouldUseSsl(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
      max: 10,
      connectionTimeoutMillis: 15000,
    };
  }

  // 3. Default empty config (pg reads PGHOST / PGUSER / PGDATABASE / PGPASSWORD)
  return {
    max: 10,
    connectionTimeoutMillis: 15000,
  };
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(buildPoolConfig());

    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
export { pool, schema };
