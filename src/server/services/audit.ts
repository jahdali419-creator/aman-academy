import type { Db } from "../db/client";
import { auditLog } from "../db/schema";

/** Record an important change. Do not pass secrets or exam answers in `meta`. */
export async function logAudit(
  db: Db,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  meta: Record<string, unknown> = {},
) {
  await db.insert(auditLog).values({ actorId, action, entityType, entityId, meta });
}
