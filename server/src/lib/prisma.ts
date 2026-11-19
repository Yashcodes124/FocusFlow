import { randomUUID } from "node:crypto";

type WhereClause = Record<string, unknown>;
type RecordRow = Record<string, unknown> & { id: string };

interface MockDelegate {
  findMany: (args?: { where?: WhereClause }) => Promise<RecordRow[]>;
  findFirst: (args?: { where?: WhereClause }) => Promise<RecordRow | null>;
  findUnique: (args: { where: WhereClause }) => Promise<RecordRow | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<RecordRow>;
  update: (args: {
    where: WhereClause;
    data: Record<string, unknown>;
  }) => Promise<RecordRow | null>;
  delete: (args: { where: WhereClause }) => Promise<RecordRow | null>;
}

function createInMemoryPrisma() {
  const tables = new Map<string, RecordRow[]>();

  const getTable = (name: string): RecordRow[] => {
    let rows = tables.get(name);
    if (!rows) {
      rows = [];
      tables.set(name, rows);
    }
    return rows;
  };

  const matchesWhere = (row: RecordRow, where?: WhereClause): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => row[key] === value);
  };

  const createDelegate = (modelName: string): MockDelegate => ({
    findMany: async (args) => {
      const rows = getTable(modelName);
      return rows.filter((row) => matchesWhere(row, args?.where));
    },
    findFirst: async (args) => {
      const rows = getTable(modelName);
      return rows.find((row) => matchesWhere(row, args?.where)) ?? null;
    },
    findUnique: async (args) => {
      const rows = getTable(modelName);
      return rows.find((row) => matchesWhere(row, args.where)) ?? null;
    },
    create: async (args) => {
      const rows = getTable(modelName);
      const now = new Date();
      const defaults: Record<string, unknown> =
        modelName === "user"
          ? {
              theme: "light",
              language: "en",
              isEmailVerified: false,
            }
          : {};
      const record: RecordRow = {
        ...defaults,
        ...args.data,
        id:
          typeof args.data.id === "string" && args.data.id.length > 0
            ? args.data.id
            : randomUUID(),
        createdAt: args.data.createdAt ?? now,
        updatedAt: args.data.updatedAt ?? now,
      };
      rows.push(record);
      return record;
    },
    update: async (args) => {
      const rows = getTable(modelName);
      const index = rows.findIndex((row) => matchesWhere(row, args.where));
      if (index === -1) return null;
      const existing = rows[index]!;
      const updated: RecordRow = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      rows[index] = updated;
      return updated;
    },
    delete: async (args) => {
      const rows = getTable(modelName);
      const index = rows.findIndex((row) => matchesWhere(row, args.where));
      if (index === -1) return null;
      const [removed] = rows.splice(index, 1);
      return removed ?? null;
    },
  });

  const delegates = new Map<string, MockDelegate>();

  return new Proxy({} as Record<string, MockDelegate>, {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "$connect" || prop === "$disconnect") {
        return async () => {};
      }
      let delegate = delegates.get(prop);
      if (!delegate) {
        delegate = createDelegate(prop);
        delegates.set(prop, delegate);
      }
      return delegate;
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;

if (process.env.DATABASE_URL) {
  try {
    const clientModulePath = "../../generated/prisma/client.js";
    const { PrismaClient } = await import(clientModulePath);
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prisma = new PrismaClient({ adapter });
  } catch {
    console.warn("[AI Studio] Database not connected — using in-memory mock");
    prisma = createInMemoryPrisma();
  }
} else {
  console.warn("[AI Studio] DATABASE_URL not set — using in-memory mock");
  prisma = createInMemoryPrisma();
}

export default prisma;
