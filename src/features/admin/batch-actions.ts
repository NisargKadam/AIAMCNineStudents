"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { batchSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { batchLabel, pluralize } from "@/lib/utils";

/**
 * Serialises changes to which batch is enrolling, so two administrators acting
 * at once cannot leave two batches enrolling.
 */
async function lockEnrolment(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(911011)`;
}

function refreshBatchViews() {
  revalidatePath("/admin/batches");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  revalidatePath("/sessions");
  revalidatePath("/materials");
  revalidatePath("/students");
}

/**
 * Creates a batch. Its session list starts with the same titles as the newest
 * batch that has sessions, without any dates, links, recordings, or files, so
 * the instructor only has to fill in the new schedule.
 */
export async function createBatchAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { number } = parsed.data;
  if (await db.batch.findUnique({ where: { number } }))
    return { error: `${batchLabel(number)} already exists.` };

  // The first batch is always the one new students join.
  const isEnrolling = parsed.data.isEnrolling || (await db.batch.count()) === 0;
  const template = await db.batch.findFirst({
    where: { sessions: { some: {} } },
    orderBy: { number: "desc" },
    include: {
      sessions: {
        orderBy: { sortOrder: "asc" },
        select: { sortOrder: true, title: true, isActive: true },
      },
    },
  });

  const batch = await db.$transaction(async (tx) => {
    await lockEnrolment(tx);
    if (isEnrolling)
      await tx.batch.updateMany({
        where: { isEnrolling: true },
        data: { isEnrolling: false },
      });
    return tx.batch.create({
      data: {
        number,
        isEnrolling,
        sessions: { create: template?.sessions ?? [] },
      },
    });
  });

  const copied = template?.sessions.length ?? 0;
  await audit(admin.id, "batch_created", "Batch", batch.id, {
    number,
    isEnrolling,
    sessionsCopiedFrom: template?.number ?? null,
  });
  refreshBatchViews();
  return {
    success: [
      `${batchLabel(number)} created.`,
      copied
        ? `It starts with ${copied} ${pluralize(copied, "session")} titled like ${batchLabel(template!.number)}; add its dates and links on Sessions.`
        : "Add its sessions on the Sessions page.",
      isEnrolling ? "New students now join this batch." : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** Makes this the one batch that newly added students join. */
export async function setEnrollingBatchAction(batchId: string) {
  const admin = await requireAdmin();
  const batch = await db.batch.findUnique({ where: { id: batchId } });
  if (!batch) return { error: "That batch no longer exists." };
  if (batch.isEnrolling)
    return { success: `${batchLabel(batch.number)} is already enrolling.` };

  await db.$transaction(async (tx) => {
    await lockEnrolment(tx);
    await tx.batch.updateMany({
      where: { isEnrolling: true },
      data: { isEnrolling: false },
    });
    await tx.batch.update({
      where: { id: batchId },
      data: { isEnrolling: true },
    });
  });
  await audit(admin.id, "batch_enrolling_changed", "Batch", batchId, {
    number: batch.number,
  });
  refreshBatchViews();
  return {
    success: `New students now join ${batchLabel(batch.number)}. Nobody already enrolled was moved.`,
  };
}

/**
 * Removes an empty batch together with its sessions and their materials. A
 * batch that still has people in it, or that new students are joining, stays.
 */
export async function deleteBatchAction(batchId: string) {
  const admin = await requireAdmin();
  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      _count: {
        select: { students: { where: { role: "STUDENT" } }, sessions: true },
      },
    },
  });
  if (!batch) return { error: "That batch no longer exists." };

  const label = batchLabel(batch.number);
  if (batch._count.students > 0)
    return {
      error: `${label} still has ${batch._count.students} ${pluralize(batch._count.students, "student")}. Move them to another batch first.`,
    };
  if ((await db.batch.count()) <= 1)
    return {
      error: `${label} is the only batch. Create the next batch before deleting this one.`,
    };
  if (batch.isEnrolling)
    return {
      error: `New students join ${label}. Make another batch enrolling first.`,
    };

  // Administrators promoted from this batch keep no tie to it. A student who
  // joined since the check above still blocks the delete through the foreign
  // key, rather than silently losing their batch.
  try {
    await db.$transaction([
      db.user.updateMany({
        where: { batchId, role: "ADMIN" },
        data: { batchId: null },
      }),
      db.batch.delete({ where: { id: batchId } }),
    ]);
  } catch (error) {
    // P2003: the foreign key refused because a student still points here.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    )
      return {
        error: `${label} gained a student just now. Move them to another batch first.`,
      };
    throw error;
  }
  await audit(admin.id, "batch_deleted", "Batch", batchId, {
    number: batch.number,
    sessions: batch._count.sessions,
  });
  refreshBatchViews();
  return { success: `${label} and its sessions were deleted.` };
}
