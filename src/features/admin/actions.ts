"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import {
  adminPasswordSchema,
  studentSchema,
  studentUpdateSchema,
} from "@/lib/validation";
import { audit } from "@/lib/audit";

/** The final active administrator must never be removed, demoted, or disabled. */
async function isLastActiveAdmin(userId: string) {
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (target?.role !== Role.ADMIN || !target.isActive) return false;
  const admins = await db.user.count({
    where: { role: Role.ADMIN, isActive: true },
  });
  return admins <= 1;
}

function refreshStudentViews(userId?: string) {
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  revalidatePath("/students");
  if (userId) revalidatePath(`/admin/students/${userId}`);
}

export async function createStudentAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const password = parsed.data.password || process.env.DEFAULT_STUDENT_PASSWORD;
  if (!password)
    return {
      error:
        "No password was given and DEFAULT_STUDENT_PASSWORD is not configured.",
    };

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) return { error: "That email already belongs to an account." };

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
  await audit(admin.id, "student_created", "User", user.id, {
    email: user.email,
    customPassword: Boolean(parsed.data.password),
  });
  refreshStudentViews();
  return {
    success: parsed.data.password
      ? `${parsed.data.fullName} can sign in with the password you set.`
      : `${parsed.data.fullName} can sign in with the cohort default password.`,
  };
}

export async function updateStudentAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = studentUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { userId, email, fullName, githubUsername, currentRole, country } =
    parsed.data;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "That account no longer exists." };

  if (email !== target.email) {
    const clash = await db.user.findUnique({ where: { email } });
    if (clash) return { error: "Another account already uses that email." };
  }

  await db.user.update({
    where: { id: userId },
    data: {
      email,
      profile: {
        upsert: {
          create: {
            fullName,
            githubUsername: githubUsername || null,
            currentRole: currentRole || null,
            country: country || null,
          },
          update: {
            fullName,
            githubUsername: githubUsername || null,
            currentRole: currentRole || null,
            country: country || null,
          },
        },
      },
    },
  });
  await audit(admin.id, "student_updated", "User", userId, { email });
  refreshStudentViews(userId);
  return { success: "Student details saved." };
}

export async function setStudentActiveAction(
  userId: string,
  isActive: boolean,
) {
  const admin = await requireAdmin();
  if (userId === admin.id && !isActive)
    return { error: "You cannot deactivate your own account." };
  if (!isActive && (await isLastActiveAdmin(userId)))
    return { error: "The last active administrator cannot be deactivated." };

  await db.user.update({ where: { id: userId }, data: { isActive } });
  if (!isActive) await db.session.deleteMany({ where: { userId } });
  await audit(
    admin.id,
    isActive ? "student_enabled" : "student_disabled",
    "User",
    userId,
  );
  refreshStudentViews(userId);
  return { success: isActive ? "Account activated." : "Account deactivated." };
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
  refreshStudentViews(userId);
  return {
    success: "Password reset to the cohort default and sessions ended.",
  };
}

export async function setStudentPasswordAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = adminPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
  });
  await db.session.deleteMany({ where: { userId: parsed.data.userId } });
  await audit(admin.id, "password_set_by_admin", "User", parsed.data.userId);
  refreshStudentViews(parsed.data.userId);
  return { success: "Password set. Existing sessions were ended." };
}

export async function changeStudentRoleAction(userId: string, role: Role) {
  const admin = await requireAdmin();
  if (userId === admin.id && role !== Role.ADMIN)
    return { error: "You cannot demote your own account." };
  if (role === Role.STUDENT && (await isLastActiveAdmin(userId)))
    return { error: "The last active administrator cannot be demoted." };

  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "role_changed", "User", userId, { role });
  refreshStudentViews(userId);
  return {
    success:
      role === Role.ADMIN
        ? "Account promoted to administrator."
        : "Account changed to student.",
  };
}

export async function deleteStudentAction(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id)
    return { error: "You cannot delete your own account." };
  if (await isLastActiveAdmin(userId))
    return { error: "The last active administrator cannot be deleted." };

  const target = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!target) return { error: "That account no longer exists." };

  // Audited before the row disappears; the log survives with the actor intact.
  await audit(admin.id, "student_deleted", "User", userId, {
    email: target.email,
    fullName: target.profile?.fullName ?? null,
  });
  await db.user.delete({ where: { id: userId } });

  refreshStudentViews();
  revalidatePath("/community");
  return {
    success: `${target.profile?.fullName ?? target.email} and all of their portal data were deleted.`,
  };
}

export async function bulkStudentAction(
  userIds: string[],
  operation: "activate" | "deactivate" | "delete",
) {
  const admin = await requireAdmin();
  const targets = userIds.filter((id) => id !== admin.id);
  if (targets.length === 0)
    return { error: "Select at least one account other than your own." };

  const skipped: string[] = [];
  for (const userId of targets) {
    if (operation !== "activate" && (await isLastActiveAdmin(userId))) {
      skipped.push(userId);
      continue;
    }
    if (operation === "delete") {
      const target = await db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!target) continue;
      await audit(admin.id, "student_deleted", "User", userId, {
        email: target.email,
        fullName: target.profile?.fullName ?? null,
      });
      await db.user.delete({ where: { id: userId } });
    } else {
      const isActive = operation === "activate";
      await db.user.update({ where: { id: userId }, data: { isActive } });
      if (!isActive) await db.session.deleteMany({ where: { userId } });
      await audit(
        admin.id,
        isActive ? "student_enabled" : "student_disabled",
        "User",
        userId,
      );
    }
  }

  refreshStudentViews();
  const done = targets.length - skipped.length;
  const verb =
    operation === "delete"
      ? "deleted"
      : operation === "activate"
        ? "activated"
        : "deactivated";
  return {
    success: `${done} ${done === 1 ? "account" : "accounts"} ${verb}.${
      skipped.length ? " The last administrator was left untouched." : ""
    }`,
  };
}
