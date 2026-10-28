"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { cohortSessionSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { batchLabel } from "@/lib/utils";

export async function upsertSessionAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = cohortSessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { id, batchId: requestedBatchId, scheduledAt, ...rest } = parsed.data;
  const data = {
    ...rest,
    description: rest.description || null,
    joinUrl: rest.joinUrl || null,
    recordingUrl: rest.recordingUrl || null,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  };
  if (data.scheduledAt && Number.isNaN(data.scheduledAt.getTime()))
    return { error: "That date and time could not be read." };

  // A session stays in the batch it was created for; a new one needs a batch.
  const existing = id
    ? await db.cohortSession.findUnique({
        where: { id },
        select: { batchId: true },
      })
    : null;
  if (id && !existing) return { error: "That session no longer exists." };
  const batch = await db.batch.findUnique({
    where: { id: existing?.batchId ?? requestedBatchId ?? "" },
  });
  if (!batch) return { error: "Pick the batch this session belongs to." };

  const clash = await db.cohortSession.findUnique({
    where: {
      batchId_sortOrder: { batchId: batch.id, sortOrder: data.sortOrder },
    },
  });
  if (clash && clash.id !== id)
    return {
      error: `${batchLabel(batch.number)} already has a session ${data.sortOrder}.`,
    };

  const session = id
    ? await db.cohortSession.update({ where: { id }, data })
    : await db.cohortSession.create({ data: { ...data, batchId: batch.id } });

  await audit(
    admin.id,
    id ? "session_updated" : "session_created",
    "CohortSession",
    session.id,
    { title: session.title, batch: batch.number },
  );
  revalidatePath("/sessions");
  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/admin/batches");
  return { success: id ? "Session saved." : "Session added." };
}

export async function deleteSessionAction(id: string) {
  const admin = await requireAdmin();
  const session = await db.cohortSession.findUnique({
    where: { id },
    include: { batch: { select: { number: true } } },
  });
  if (!session) return { error: "That session no longer exists." };

  await db.cohortSession.delete({ where: { id } });
  await audit(admin.id, "session_deleted", "CohortSession", id, {
    title: session.title,
    batch: session.batch.number,
  });
  revalidatePath("/sessions");
  revalidatePath("/materials");
  revalidatePath("/dashboard");
  revalidatePath("/admin/batches");
  return { success: "Session deleted." };
}
