"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { signupSchema } from "@/lib/validation";
import { createAlumniUser } from "./service";

export type SignupState =
  | null
  | { error: string; code?: "exists" | "waiting" | "declined" }
  | { pending: { email: string; fullName: string } };

const HOUR = 60 * 60 * 1000;
const SUBMISSIONS_PER_HOUR = 10;

const exists = {
  code: "exists",
  error: "This email already has an account.",
} as const;
const waiting = {
  code: "waiting",
  error:
    "A sign-up for this email is already waiting for your instructor's approval. You can sign in as soon as it is approved.",
} as const;
const declined = {
  code: "declined",
  error:
    "A sign-up for this email was not approved. Contact your instructor if you think this is a mistake.",
} as const;

const isDuplicate = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

function refreshAdminViews() {
  revalidatePath("/admin/signups");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
}

/**
 * The public sign-up for students of Batches 1 to 10. A pre-approved email
 * gets a certification-only account at once; any other email becomes a
 * request the instructor approves or declines.
 */
export async function signupAction(
  _: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    alumniBatch: formData.get("alumniBatch"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { alumniBatch, fullName, email, password } = parsed.data;

  // Every submission counts, so the form cannot be used to probe which emails
  // have accounts or to flood the instructor's queue.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const identifier = `signup:${ip}`;
  const recent = await db.loginAttempt.count({
    where: { identifier, attemptedAt: { gte: new Date(Date.now() - HOUR) } },
  });
  if (recent >= SUBMISSIONS_PER_HOUR)
    return {
      error:
        "Too many sign-up attempts from this network. Try again in an hour.",
    };
  await db.loginAttempt.create({ data: { identifier, succeeded: true } });

  const account = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (account) return exists;

  // A declined request is the instructor's answer for this email. It stands
  // even if the email is later pre-approved, until they approve it themselves.
  const request = await db.signupRequest.findUnique({ where: { email } });
  if (request) return request.status === "DECLINED" ? declined : waiting;

  const passwordHash = await bcrypt.hash(password, 12);
  const preapproved = await db.preapprovedEmail.findUnique({
    where: { email },
  });

  if (!preapproved) {
    try {
      const created = await db.signupRequest.create({
        data: { email, fullName, alumniBatch, passwordHash },
      });
      await db.auditLog.create({
        data: {
          action: "signup_requested",
          entityType: "SignupRequest",
          entityId: created.id,
          metadata: { email, alumniBatch },
        },
      });
    } catch (error) {
      if (isDuplicate(error)) return waiting;
      throw error;
    }
    refreshAdminViews();
    return { pending: { email, fullName } };
  }

  let userId: string;
  try {
    userId = await db.$transaction(async (tx) => {
      const user = await createAlumniUser(tx, {
        email,
        fullName,
        alumniBatch,
        passwordHash,
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "alumni_signed_up",
          entityType: "User",
          entityId: user.id,
          metadata: { email, alumniBatch },
        },
      });
      return user.id;
    });
  } catch (error) {
    // Two submissions at once: the other one created the account.
    if (isDuplicate(error)) return exists;
    throw error;
  }
  await createSession(userId);
  refreshAdminViews();
  redirect("/welcome");
}
