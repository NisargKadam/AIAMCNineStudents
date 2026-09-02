import { db } from "@/lib/db";
export async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await db.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
}
