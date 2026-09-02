"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import {
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth/session";

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const forwarded =
    (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "local";
  const identifier = `${forwarded}:${parsed.data.email}`;
  const recentFailures = await db.loginAttempt.count({
    where: {
      identifier,
      succeeded: false,
      attemptedAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
  });
  if (recentFailures >= 8)
    return { error: "Too many sign-in attempts. Try again in 15 minutes." };
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : false;
  await db.loginAttempt.create({
    data: { identifier, succeeded: Boolean(valid && user?.isActive) },
  });
  if (!user || !valid) return { error: "Invalid email or password." };
  if (!user.isActive)
    return { error: "This account is inactive. Contact an administrator." };
  await createSession(user.id, parsed.data.remember);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
