"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { cohortSessionSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function upsertSessionAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = cohortSessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { id, scheduledAt, ...rest } = parsed.data;
  const data = {
    ...rest,
    description: rest.description || null,
    joinUrl: rest.joinUrl || null,
    recordingUrl: rest.recordingUrl || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  };
  if (data.scheduledAt && Number.isNaN(data.scheduledAt.getTime()))
    return { error: "That date and time could not be read." };

  const clash = await db.cohortSession.findUnique({
    where: { sortOrder: data.sortOrder },
  });
  if (clash && clash.id !== id)
    return { error: `Session ${data.sortOrder} already exists.` };

  const session = id
    ? await db.cohortSession.update({ where: { id }, data })
    : await db.cohortSession.create({ data });

  await audit(
    admin.id,
    id ? "session_updated" : "session_created",
    "CohortSession",
    session.id,
    { title: session.title },
  );
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  return { success: id ? "Session saved." : "Session added." };
}

export async function deleteSessionAction(id: string) {
  const admin = await requireAdmin();
  const session = await db.cohortSession.findUnique({ where: { id } });
  if (!session) return { error: "That session no longer exists." };

  await db.cohortSession.delete({ where: { id } });
  await audit(admin.id, "session_deleted", "CohortSession", id, {
    title: session.title,
  });
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  return { success: "Session deleted." };
}
