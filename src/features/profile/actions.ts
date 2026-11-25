"use server";

import bcrypt from "bcryptjs";
import type { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  requireSignedIn,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth/session";
import { encryptField } from "@/lib/encryption";
import {
  passwordChangeSchema,
  profileSchema,
  studentProfileSchema,
  welcomeSchema,
} from "@/lib/validation";
import { audit } from "@/lib/audit";

/** A form field as text; a field the form did not send reads as empty. */
function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function profileFields(formData: FormData) {
  return {
    fullName: text(formData, "fullName"),
    githubUsername: text(formData, "githubUsername"),
    linkedinUrl: text(formData, "linkedinUrl"),
    currentRole: text(formData, "currentRole"),
    country: text(formData, "country"),
    timezone: text(formData, "timezone"),
    bio: text(formData, "bio"),
    avatarUrl: text(formData, "avatarUrl"),
  };
}

async function saveProfile(
  userId: string,
  data: z.infer<typeof welcomeSchema> | z.infer<typeof profileSchema>,
  keyData: {
    encryptedOpenAiApiKey?: string | null;
    openAiKeyLastFour?: string | null;
  } = {},
) {
  const fields = {
    fullName: data.fullName,
    githubUsername: data.githubUsername || null,
    linkedinUrl: data.linkedinUrl || null,
    currentRole: data.currentRole || null,
    country: data.country || null,
    timezone: data.timezone || null,
    bio: data.bio || null,
    avatarUrl: data.avatarUrl || null,
    ...keyData,
  };
  await db.studentProfile.upsert({
    where: { userId },
    update: fields,
    create: { userId, ...fields },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export async function updateProfileAction(_: unknown, formData: FormData) {
  const user = await requireSignedIn();
  // Students must keep a photo, role, and country once they have them;
  // administrators' profiles stay optional.
  const schema = user.role === "ADMIN" ? profileSchema : studentProfileSchema;
  const parsed = schema.safeParse({
    ...profileFields(formData),
    openAiApiKey: text(formData, "openAiApiKey"),
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
  await saveProfile(user.id, data, keyData);
  return { success: "Profile saved." };
}

/**
 * The welcome step: the photo and details everyone adds before using the
 * portal. Saving them opens the portal.
 */
export async function completeProfileAction(_: unknown, formData: FormData) {
  const user = await requireSignedIn();
  const parsed = welcomeSchema.safeParse(profileFields(formData));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Check the form fields.",
    };
  await saveProfile(user.id, parsed.data);
  revalidatePath("/community");
  redirect("/dashboard");
}

export async function changeOwnPasswordAction(_: unknown, formData: FormData) {
  const user = await requireSignedIn();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
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
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
    }),
    db.passwordResetRequest.deleteMany({ where: { userId: user.id } }),
  ]);
  await revokeOtherSessions(user.id);
  await audit(user.id, "password_changed", "User", user.id);
  revalidatePath("/profile");
  return { success: "Password changed. Other devices were signed out." };
}
