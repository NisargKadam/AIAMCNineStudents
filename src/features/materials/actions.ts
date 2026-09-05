"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export async function deleteMaterialAction(id: string) {
  const admin = await requireAdmin();
  const file = await db.storedFile.findUnique({
    where: { id },
    select: { id: true, kind: true, fileName: true, sessionId: true },
  });
  if (!file || file.kind !== "SESSION_MATERIAL")
    return { error: "That file no longer exists." };

  await db.storedFile.delete({ where: { id } });
  await audit(admin.id, "material_deleted", "StoredFile", id, {
    sessionId: file.sessionId,
    fileName: file.fileName,
  });
  revalidatePath("/materials");
  revalidatePath("/sessions");
  return { success: `${file.fileName} removed.` };
}
