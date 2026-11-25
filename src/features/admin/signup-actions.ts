"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { pluralize } from "@/lib/utils";
import { parseEmails } from "@/features/signup/emails";
import { approveRequest } from "@/features/signup/service";

type Result = { success: string } | { error: string };

const gone = {
  error: "That request is no longer there. It may already have been handled.",
};

function refresh() {
  revalidatePath("/admin/signups");
  revalidatePath("/admin/students");
  revalidatePath("/admin");
}

/** Creates the account from a waiting or declined request. */
export async function approveSignupAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (typeof id !== "string") return gone;
  const outcome = await db.$transaction((tx) => approveRequest(tx, id));
  refresh();
  if (outcome === "missing") return gone;
  if (outcome === "exists")
    return {
      error:
        "That email already has an account, so the request was removed. Nothing about the account changed.",
    };
  await audit(admin.id, "signup_approved", "User", outcome.userId, {
    email: outcome.email,
    alumniBatch: outcome.alumniBatch,
  });
  return {
    success: `${outcome.fullName} is approved and can sign in with the password they chose.`,
  };
}

/** Keeps the request so the person is told, and cannot simply ask again. */
export async function declineSignupAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (typeof id !== "string") return gone;
  const request = await db.signupRequest.findUnique({ where: { id } });
  if (!request) return gone;
  if (request.status === "DECLINED")
    return { success: `${request.fullName}'s request was already declined.` };
  await db.signupRequest.update({
    where: { id },
    data: { status: "DECLINED", decidedAt: new Date() },
  });
  await audit(admin.id, "signup_declined", "SignupRequest", id, {
    email: request.email,
  });
  refresh();
  return {
    success: `${request.fullName}'s request was declined. You can still approve it from the Declined tab.`,
  };
}

/** Forgets a request entirely; that email may then sign up again. */
export async function deleteSignupRequestAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (typeof id !== "string") return gone;
  const request = await db.signupRequest.findUnique({ where: { id } });
  if (!request) return gone;
  await db.signupRequest.delete({ where: { id } });
  await audit(admin.id, "signup_request_deleted", "SignupRequest", id, {
    email: request.email,
  });
  refresh();
  return {
    success: `${request.fullName}'s request was removed. That email can sign up again.`,
  };
}

/**
 * Adds a pasted list to the pre-approved emails. Anyone on it who is already
 * waiting is approved at once. Someone declined earlier stays declined: their
 * request carries a password chosen by whoever submitted it, so letting it in
 * is a decision the instructor makes on purpose, from the Declined tab.
 */
export async function addPreapprovedEmailsAction(
  text: string,
): Promise<Result & { invalid?: string[] }> {
  const admin = await requireAdmin();
  if (typeof text !== "string" || text.length > 200_000)
    return { error: "That is too much text. Paste the list in smaller parts." };
  const { emails, invalid } = parseEmails(text);
  if (emails.length === 0)
    return {
      error: "No email addresses were found in that text.",
      ...(invalid.length ? { invalid } : {}),
    };

  const listed = new Set(
    (
      await db.preapprovedEmail.findMany({
        where: { email: { in: emails } },
        select: { email: true },
      })
    ).map((row) => row.email),
  );
  const added = emails.filter((email) => !listed.has(email));
  await db.preapprovedEmail.createMany({
    data: added.map((email) => ({ email })),
    skipDuplicates: true,
  });

  const requests = await db.signupRequest.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, status: true },
  });
  let approved = 0;
  for (const request of requests) {
    if (request.status !== "PENDING") continue;
    const outcome = await db.$transaction((tx) =>
      approveRequest(tx, request.id),
    );
    if (typeof outcome !== "object") continue;
    approved += 1;
    await audit(admin.id, "signup_approved", "User", outcome.userId, {
      email: outcome.email,
      alumniBatch: outcome.alumniBatch,
      via: "pre-approved list",
    });
  }
  const declined = requests
    .filter((request) => request.status === "DECLINED")
    .map((request) => request.email);

  if (added.length > 0)
    await audit(
      admin.id,
      "preapproved_emails_added",
      "PreapprovedEmail",
      undefined,
      {
        added: added.length,
      },
    );
  refresh();

  const already = emails.length - added.length;
  return {
    success: [
      added.length
        ? `${added.length} ${pluralize(added.length, "email")} added.`
        : "Nothing new to add.",
      already ? `${already} already on the list.` : "",
      approved
        ? `${approved} waiting ${pluralize(approved, "request")} approved.`
        : "",
      declined.length
        ? `Declined earlier, and still declined: ${declined.join(", ")}. Approve from the Declined tab if you have changed your mind.`
        : "",
      invalid.length
        ? `${invalid.length} ${pluralize(invalid.length, "entry", "entries")} did not look like an email and ${invalid.length === 1 ? "was" : "were"} skipped.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    ...(invalid.length ? { invalid } : {}),
  };
}

export async function removePreapprovedEmailAction(
  email: string,
): Promise<Result> {
  const admin = await requireAdmin();
  const target = typeof email === "string" ? email.trim().toLowerCase() : "";
  const removed = await db.preapprovedEmail.deleteMany({
    where: { email: target },
  });
  if (removed.count === 0)
    return { error: "That email is not on the pre-approved list." };
  await audit(
    admin.id,
    "preapproved_email_removed",
    "PreapprovedEmail",
    undefined,
    {
      email: target,
    },
  );
  refresh();
  return {
    success: `${target} was removed. Anyone who already joined keeps their account.`,
  };
}
