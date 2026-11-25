import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/authorization";
import { isAlumni } from "@/lib/access";
import { profileGaps } from "@/lib/profile-gaps";
import { hashSessionToken } from "@/lib/auth/crypto";

const COOKIE_NAME = "aiamc_session";
const DAY = 86_400_000;
export { hashSessionToken, verifyPassword } from "@/lib/auth/crypto";

export async function createSession(userId: string, remember = false) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (remember ? 30 : 1) * DAY);
  await db.session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token)
    await db.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  cookieStore.delete(COOKIE_NAME);
}

/** Signs every other device out while keeping this browser signed in. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  await db.session.deleteMany({
    where: {
      userId,
      ...(token ? { NOT: { tokenHash: hashSessionToken(token) } } : {}),
    },
  });
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { profile: true, batch: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive)
    return null;
  return session.user;
});

/**
 * Signed in, and nothing more. Only for the places someone with an unfinished
 * profile must still reach: the shell, the welcome step, saving a profile,
 * uploading a photo, and an exam that is already running.
 */
export async function requireSignedIn() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The guard for portal pages and actions. Everyone except an administrator
 * must have a photo and a complete profile first; until then they are taken
 * to the welcome step.
 */
export async function requireUser() {
  const user = await requireSignedIn();
  if (!canAccessAdmin(user.role) && profileGaps(user.profile).length > 0)
    redirect("/welcome");
  return user;
}

/**
 * For everything that belongs to a live batch: sessions, materials, the
 * readiness checklist, assignments, the directory. Alumni hold a
 * certification-only account and are sent back to their home.
 */
export async function requireFullAccess() {
  const user = await requireUser();
  if (isAlumni(user)) redirect("/dashboard");
  return user;
}

export async function requireAdmin() {
  const user = await requireSignedIn();
  if (!canAccessAdmin(user.role)) redirect("/unauthorized");
  return user;
}
