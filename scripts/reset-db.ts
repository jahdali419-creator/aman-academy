/**
 * Delete the embedded demo database (.data/pglite). It is recreated, migrated
 * and re-seeded with fresh fictional data on the next start.
 * Refuses to run when DATABASE_URL points at a real PostgreSQL server.
 */
import fs from "node:fs";
import path from "node:path";

if (process.env.DATABASE_URL) {
  console.error("DATABASE_URL is set: refusing to reset a real database. Reset it with your own database tools.");
  process.exit(1);
}
const dir = path.join(process.cwd(), ".data", "pglite");
fs.rmSync(dir, { recursive: true, force: true });
console.log("Demo database removed. Stop any running server first; it will be recreated on the next start.");
