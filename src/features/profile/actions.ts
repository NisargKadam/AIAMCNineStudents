"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { encryptField } from "@/lib/encryption";
import { profileSchema } from "@/lib/validation";

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
