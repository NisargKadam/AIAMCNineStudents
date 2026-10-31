"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { startExam, mutateExam, withExamLock, ExamError } from "./service";
import { bankForVersion } from "./bank";
import { checkPython } from "./python";
import { supportsCertificateName } from "./certificate";
import type { ActiveExam, ExamResult, CertificateView } from "./types";

export async function startExamAction(): Promise<{
  error?: string;
  active?: ActiveExam | null;
}> {
  const user = await requireUser();
  if (user.role !== "STUDENT")
    return {
      error:
        "The assessed exam is for students. Use the admin exam console to review it.",
    };
  try {
    const active = await startExam(user.id);
    revalidatePath("/exam");
    return { active };
  } catch (error) {
    if (error instanceof ExamError) return { error: error.message };
    throw error;
  }
}

export async function saveExamAction(
  id: string,
  answers: unknown,
  submit = false,
): Promise<{ error?: string; result?: ExamResult | null; serverNow?: string }> {
  const user = await requireUser();
  if (
    user.role !== "STUDENT" ||
    typeof id !== "string" ||
    id.length > 100 ||
    typeof submit !== "boolean"
  )
    return { error: "Invalid request." };
  try {
    const saved = await mutateExam(user.id, id, answers, submit);
    if (saved.result) revalidatePath("/exam");
    return saved;
  } catch (error) {
    if (error instanceof ExamError) return { error: error.message };
    throw error;
  }
}

// Only the single public example is exposed to the student. Results from hidden
// grading cases and the reference implementation never cross this boundary.
export async function runExampleAction(
  attemptId: string,
  questionId: string,
  code: string,
): Promise<{ error?: string; passed?: boolean }> {
  const user = await requireUser();
  if (
    user.role !== "STUDENT" ||
    typeof attemptId !== "string" ||
    typeof questionId !== "string" ||
    typeof code !== "string" ||
    code.length > 12000
  )
    return { error: "Invalid request." };
  return withExamLock(user.id, async (tx) => {
    const a = await tx.examAttempt.findFirst({
      where: {
        id: attemptId,
        userId: user.id,
        status: "IN_PROGRESS",
        deadline: { gt: new Date() },
      },
    });
    if (!a) return { error: "This attempt is no longer active." };
    // Durable per-student throttling, including across app replicas.
    const recent = await tx.auditLog.findFirst({
      where: {
        actorId: user.id,
        action: "exam_example_run",
        createdAt: { gt: new Date(Date.now() - 2000) },
      },
    });
    if (recent) return { error: "Wait two seconds before running again." };
    const q = bankForVersion(a.version).find(
      (q) => q.id === questionId && q.example,
    );
    if (!q?.example || !q.functionName)
      return { error: "No runnable example for this question." };
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "exam_example_run",
        entityType: "ExamAttempt",
        entityId: attemptId,
      },
    });
    const result = await checkPython(code, q.functionName, q.example);
    return { passed: result.passed, error: result.error };
  });
}

export async function issueCertificateAction(
  input: unknown,
): Promise<{ error?: string; certificate?: CertificateView }> {
  const user = await requireUser();
  const parsed = z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(
      /^[\p{L}\p{M} .'-]+$/u,
      "Use your name with letters, spaces, apostrophes, periods or hyphens.",
    )
    .refine(
      (name) => /\p{L}/u.test(name),
      "Enter your name using at least one letter.",
    )
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await supportsCertificateName(parsed.data)))
    return {
      error:
        "This PDF font does not support some characters in your name. Please use its Latin transliteration.",
    };
  return withExamLock(user.id, async (tx) => {
    if (user.role !== "STUDENT")
      return { error: "Student certification only." };
    const existing = await tx.examCertificate.findUnique({
      where: { userId: user.id },
    });
    if (existing)
      return {
        certificate: {
          id: existing.id,
          name: existing.name,
          issuedAt: existing.issuedAt.toISOString(),
        },
      };
    const passed = await tx.examAttempt.findFirst({
      where: {
        userId: user.id,
        status: "SUBMITTED",
        passed: true,
        score: { gte: 90 },
      },
      orderBy: { submittedAt: "asc" },
    });
    if (!passed)
      return {
        error: "Pass the exam with at least 90% to earn your certificate.",
      };
    const certificate = await tx.examCertificate.create({
      data: { userId: user.id, attemptId: passed.id, name: parsed.data },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "certificate_issued",
        entityType: "ExamCertificate",
        entityId: certificate.id,
      },
    });
    revalidatePath("/exam");
    return {
      certificate: {
        id: certificate.id,
        name: certificate.name,
        issuedAt: certificate.issuedAt.toISOString(),
      },
    };
  });
}
