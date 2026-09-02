"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  requireUser,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth/session";
import { encryptField } from "@/lib/encryption";
import { passwordChangeSchema, profileSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function updateProfileAction(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    githubUsername: formData.get("githubUsername"),
    linkedinUrl: formData.get("linkedinUrl"),
    currentRole: formData.get("currentRole"),
    country: formData.get("country"),
    timezone: formData.get("timezone"),
    bio: formData.get("bio"),
    avatarUrl: formData.get("avatarUrl"),
    openAiApiKey: formData.get("openAiApiKey"),
    removeApiKey: formData.get("removeApiKey") === "true",
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form fields.",
    };
  const data = parsed.data;
  const keyData = data.removeApiKey
    ? { encryptedOpenAiApiKey: null, openAiKeyLastFour: null }
    : data.openAiApiKey
      ? {
          encryptedOpenAiApiKey: encryptField(data.openAiApiKey),
          openAiKeyLastFour: data.openAiApiKey.slice(-4),
        }
      : {};
  await db.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: data.fullName,
      githubUsername: data.githubUsername || null,
      linkedinUrl: data.linkedinUrl || null,
      currentRole: data.currentRole || null,
      country: data.country || null,
      timezone: data.timezone || null,
      bio: data.bio || null,
      avatarUrl: data.avatarUrl || null,
      ...keyData,
    },
    create: {
      userId: user.id,
      fullName: data.fullName,
      githubUsername: data.githubUsername || null,
      linkedinUrl: data.linkedinUrl || null,
      currentRole: data.currentRole || null,
      country: data.country || null,
      timezone: data.timezone || null,
      bio: data.bio || null,
      avatarUrl: data.avatarUrl || null,
      ...keyData,
    },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Profile saved." };
}

export async function changeOwnPasswordAction(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check both fields." };
  if (parsed.data.currentPassword === parsed.data.newPassword)
    return { error: "Choose a password you have not used here before." };
  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) return { error: "That is not your current password." };
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  await revokeOtherSessions(user.id);
  await audit(user.id, "password_changed", "User", user.id);
  return { success: "Password changed. Other devices were signed out." };
}
