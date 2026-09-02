"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { categorySchema, prerequisiteSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function savePrerequisiteChecklist(
  items: Array<{ id: string; completed: boolean }>,
) {
  const user = await requireUser();
  const active = await db.prerequisite.findMany({
    where: { isActive: true, category: { isActive: true } },
    select: { id: true },
  });
  const allowed = new Set(active.map((item) => item.id));
  const safeItems = items.filter((item) => allowed.has(item.id));
  await db.$transaction([
    ...safeItems.map((item) =>
      db.studentPrerequisite.upsert({
        where: {
          userId_prerequisiteId: { userId: user.id, prerequisiteId: item.id },
        },
        update: {
          completed: item.completed,
          completedAt: item.completed ? new Date() : null,
        },
        create: {
          userId: user.id,
          prerequisiteId: item.id,
          completed: item.completed,
          completedAt: item.completed ? new Date() : null,
        },
      }),
    ),
    db.prerequisiteConfirmation.updateMany({
      where: { userId: user.id, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    }),
  ]);
  revalidatePath("/prerequisites");
  revalidatePath("/dashboard");
  return { success: "Progress saved. Reconfirm when you are ready." };
}

export async function confirmPrerequisites() {
  const user = await requireUser();
  const [config, total, completed] = await Promise.all([
    db.prerequisiteConfig.findUnique({ where: { id: 1 } }),
    db.prerequisite.count({
      where: { isActive: true, category: { isActive: true } },
    }),
    db.studentPrerequisite.count({
      where: {
        userId: user.id,
        completed: true,
        prerequisite: { isActive: true, category: { isActive: true } },
      },
    }),
  ]);
  if (!total || completed !== total)
    return { error: `Complete all ${total} items before confirming.` };
  await db.prerequisiteConfirmation.upsert({
    where: { userId: user.id },
    update: {
      confirmedAt: new Date(),
      confirmedVersion: config?.version ?? 1,
      invalidatedAt: null,
    },
    create: {
      userId: user.id,
      confirmedAt: new Date(),
      confirmedVersion: config?.version ?? 1,
    },
  });
  revalidatePath("/prerequisites");
  revalidatePath("/dashboard");
  return { success: "Prerequisites confirmed." };
}

async function bumpVersion() {
  await db.prerequisiteConfig.upsert({
    where: { id: 1 },
    update: { version: { increment: 1 } },
    create: { id: 1, version: 1 },
  });
}

export async function upsertCategoryAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, ...data } = parsed.data;
  const category = id
    ? await db.prerequisiteCategory.update({ where: { id }, data })
    : await db.prerequisiteCategory.create({ data });
  await bumpVersion();
  await audit(
    admin.id,
    id ? "prerequisite_category_updated" : "prerequisite_category_created",
    "PrerequisiteCategory",
    category.id,
  );
  revalidatePath("/admin/prerequisites");
  return { success: true };
}

export async function upsertPrerequisiteAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = prerequisiteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, ...data } = parsed.data;
  const item = id
    ? await db.prerequisite.update({ where: { id }, data })
    : await db.prerequisite.create({ data });
  await bumpVersion();
  await audit(
    admin.id,
    id ? "prerequisite_updated" : "prerequisite_created",
    "Prerequisite",
    item.id,
  );
  revalidatePath("/admin/prerequisites");
  revalidatePath("/prerequisites");
  return { success: true };
}

export async function deletePrerequisiteAction(id: string) {
  const admin = await requireAdmin();
  await db.prerequisite.delete({ where: { id } });
  await bumpVersion();
  await audit(admin.id, "prerequisite_deleted", "Prerequisite", id);
  revalidatePath("/admin/prerequisites");
  return { success: true };
}

export async function deleteCategoryAction(id: string) {
  const admin = await requireAdmin();
  await db.prerequisiteCategory.delete({ where: { id } });
  await bumpVersion();
  await audit(
    admin.id,
    "prerequisite_category_deleted",
    "PrerequisiteCategory",
    id,
  );
  revalidatePath("/admin/prerequisites");
  revalidatePath("/prerequisites");
  return { success: true };
}
