"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { studentSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function createStudentAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const password = process.env.DEFAULT_STUDENT_PASSWORD;
  if (!password)
    return { error: "DEFAULT_STUDENT_PASSWORD is not configured." };
  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: "A user with this email already exists." };
  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(password, 12),
      profile: {
        create: {
          fullName: parsed.data.fullName,
          githubUsername: parsed.data.githubUsername || null,
        },
      },
    },
  });
  await audit(admin.id, "student_created", "User", user.id);
  revalidatePath("/admin/students");
  return {
    success:
      "Student created. They can sign in using their registered email and the cohort password.",
  };
}

export async function setStudentActiveAction(
  userId: string,
  isActive: boolean,
) {
  const admin = await requireAdmin();
  if (userId === admin.id && !isActive)
    return { error: "You cannot deactivate your own account." };
  await db.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await db.session.deleteMany({ where: { userId } });
  await audit(
    admin.id,
    isActive ? "student_enabled" : "student_disabled",
    "User",
    userId,
  );
  revalidatePath("/admin/students");
  return { success: true };
}
export async function resetStudentPasswordAction(userId: string) {
  const admin = await requireAdmin();
  const password = process.env.DEFAULT_STUDENT_PASSWORD;
  if (!password)
    return { error: "DEFAULT_STUDENT_PASSWORD is not configured." };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await db.session.deleteMany({ where: { userId } });
  await audit(admin.id, "password_reset", "User", userId);
  return { success: true };
}
export async function changeStudentRoleAction(userId: string, role: Role) {
  const admin = await requireAdmin();
  if (userId === admin.id && role !== Role.ADMIN)
    return { error: "You cannot demote your own account." };
  if (role === Role.STUDENT) {
    const admins = await db.user.count({
      where: { role: Role.ADMIN, isActive: true },
    });
    const target = await db.user.findUnique({ where: { id: userId } });
    if (target?.role === Role.ADMIN && admins <= 1)
      return { error: "The last active administrator cannot be demoted." };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "role_changed", "User", userId, { role });
  revalidatePath("/admin/students");
  return { success: true };
}
