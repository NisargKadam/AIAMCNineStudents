"use server";

import { revalidatePath } from "next/cache";
import { SubmissionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import {
  assignmentSchema,
  reviewSchema,
  submissionSchema,
} from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function submitAssignmentAction(input: unknown) {
  const user = await requireUser();
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const assignment = await db.assignment.findFirst({
    where: { id: parsed.data.assignmentId, isActive: true },
  });
  if (!assignment) return { error: "Assignment is unavailable." };
  const existing = await db.assignmentSubmission.findUnique({
    where: {
      userId_assignmentId: { userId: user.id, assignmentId: assignment.id },
    },
  });
  if (
    existing &&
    existing.status !== SubmissionStatus.SUBMITTED &&
    existing.status !== SubmissionStatus.NEEDS_CHANGES
  )
    return { error: "This reviewed submission can no longer be changed." };
  await db.assignmentSubmission.upsert({
    where: {
      userId_assignmentId: { userId: user.id, assignmentId: assignment.id },
    },
    update: {
      githubUrl: parsed.data.githubUrl,
      studentNote: parsed.data.studentNote || null,
      status: SubmissionStatus.SUBMITTED,
    },
    create: {
      userId: user.id,
      assignmentId: assignment.id,
      githubUrl: parsed.data.githubUrl,
      studentNote: parsed.data.studentNote || null,
    },
  });
  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { success: "Assignment submitted successfully." };
}

export async function upsertAssignmentAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { id, dueDate, ...rest } = parsed.data;
  const data = {
    ...rest,
    description: rest.description || null,
    instructions: rest.instructions || null,
    dueDate: dueDate ? new Date(dueDate) : null,
  };
  const assignment = id
    ? await db.assignment.update({ where: { id }, data })
    : await db.assignment.create({ data });
  await audit(
    admin.id,
    id ? "assignment_updated" : "assignment_created",
    "Assignment",
    assignment.id,
    { title: assignment.title },
  );
  revalidatePath("/admin/assignments");
  revalidatePath("/assignments");
  return { success: true };
}

export async function deleteAssignmentAction(id: string) {
  const admin = await requireAdmin();
  await db.assignment.delete({ where: { id } });
  await audit(admin.id, "assignment_deleted", "Assignment", id);
  revalidatePath("/admin/assignments");
  return { success: true };
}

export async function reviewSubmissionAction(input: unknown) {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const now = new Date();
  const updated = await db.assignmentSubmission.update({
    where: { id: parsed.data.submissionId },
    data: {
      status: parsed.data.status,
      instructorFeedback: parsed.data.feedback || null,
      reviewedAt: now,
      completedAt: parsed.data.status === "COMPLETED" ? now : null,
    },
  });
  await audit(
    admin.id,
    "assignment_reviewed",
    "AssignmentSubmission",
    updated.id,
    { status: updated.status },
  );
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  return { success: true };
}
