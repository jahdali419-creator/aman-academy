import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "../config";

/**
 * A database handle or an open transaction. Service functions accept this so
 * they can be composed inside a transaction and tested against a throwaway DB.
 * IMPORTANT: inside `db.transaction(async (tx) => …)` only ever use `tx`.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Instance = { db: Db; ready: Promise<void>; close: () => Promise<void> };
const g = globalThis as unknown as { __amanDb?: Instance };

const migrationsFolder = path.join(process.cwd(), "drizzle");

function create(): Instance {
  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
    const db = drizzlePg(pool, { schema });
    const ready = (async () => {
      await migratePg(db, { migrationsFolder });
      await seedIfDemo(db);
    })();
    return { db, ready, close: () => pool.end() };
  }
  // Embedded PostgreSQL (PGlite) for local development and the demo.
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  const ready = (async () => {
    await migratePglite(db, { migrationsFolder });
    await seedIfDemo(db);
  })();
  return { db, ready, close: () => client.close() };
}

async function seedIfDemo(db: Db) {
  if (!config.demoMode) return;
  const existing = await db.select({ id: schema.courses.id }).from(schema.courses).limit(1);
  if (existing.length > 0) return;
  const { seedDemo } = await import("./seed");
  await seedDemo(db);
}

function instance(): Instance {
  if (!g.__amanDb) g.__amanDb = create();
  return g.__amanDb;
}

/** Synchronous handle (used to construct the auth adapter). Prefer `database()`. */
export function getDb(): Db {
  return instance().db;
}

/** Resolves once migrations (and demo seed) have completed. */
export async function database(): Promise<Db> {
  const i = instance();
  await i.ready;
  return i.db;
}

export async function closeDatabase() {
  if (g.__amanDb) {
    await g.__amanDb.close();
    g.__amanDb = undefined;
  }
}

/** In-memory database for automated tests. */
export async function createTestDatabase(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return { db, close: () => client.close() };
}

export { schema };
