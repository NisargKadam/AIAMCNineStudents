import "server-only";
import { Prisma, type ExamAttempt } from "@prisma/client";
import { db } from "@/lib/db";
import { grade, makeLayout, publicQuestions, validAnswers } from "./engine";
import {
  EXAM_MINUTES,
  EXAM_VERSION,
  type Answers,
  type ExamLayout,
  type ExamResult,
  type SectionScore,
  type ActiveExam,
} from "./types";

export class ExamError extends Error {}
type Tx = Prisma.TransactionClient;

// Per-user transactional lock covers start, save, finalize and issue. Both
// simultaneous tabs and simultaneous start/submit requests serialize here.
export async function withExamLock<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`exam:${userId}`}))`;
      return fn(tx);
    },
    { timeout: 45000, maxWait: 15000 },
  );
}

export function resultDTO(a: ExamAttempt): ExamResult {
  return {
    id: a.id,
    number: a.number,
    score: a.score ?? 0,
    passed: a.passed,
    submittedAt: a.submittedAt!.toISOString(),
    breakdown: (a.breakdown as SectionScore[] | null) ?? [],
  };
}

export function activeDTO(a: ExamAttempt): ActiveExam {
  return {
    id: a.id,
    number: a.number,
    deadline: a.deadline.toISOString(),
    serverNow: new Date().toISOString(),
    questions: publicQuestions(a.version, a.layout as ExamLayout),
    answers: a.answers as Answers,
  };
}

async function finalize(tx: Tx, attempt: ExamAttempt, now: Date) {
  if (attempt.status === "SUBMITTED") return attempt;
  const result = await grade(attempt.version, attempt.answers as Answers);
  const submittedAt = now > attempt.deadline ? attempt.deadline : now;
  const saved = await tx.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt,
      ...result,
      breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: attempt.userId,
      action: "exam_submitted",
      entityType: "ExamAttempt",
      entityId: attempt.id,
      metadata: {
        score: result.score,
        passed: result.passed,
        timedOut: now >= attempt.deadline,
      },
    },
  });
  return saved;
}

export async function loadExam(userId: string) {
  return withExamLock(userId, async (tx) => {
    const active = await tx.examAttempt.findFirst({
      where: { userId, status: "IN_PROGRESS" },
    });
    if (active && active.deadline <= new Date())
      await finalize(tx, active, new Date());
    const [attempts, certificate] = await Promise.all([
      tx.examAttempt.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
      }),
      tx.examCertificate.findUnique({ where: { userId } }),
    ]);
    return {
      active: attempts.find((a) => a.status === "IN_PROGRESS"),
      results: attempts.filter((a) => a.status === "SUBMITTED").map(resultDTO),
      certificate: certificate
        ? {
            id: certificate.id,
            name: certificate.name,
            issuedAt: certificate.issuedAt.toISOString(),
          }
        : null,
    };
  });
}

export async function startExam(userId: string) {
  return withExamLock(userId, async (tx) => {
    if (await tx.examAttempt.findFirst({ where: { userId, passed: true } }))
      throw new ExamError(
        "You have already passed. Your certification is unlocked.",
      );
    const active = await tx.examAttempt.findFirst({
      where: { userId, status: "IN_PROGRESS" },
    });
    if (active) {
      if (active.deadline > new Date()) return activeDTO(active);
      await finalize(tx, active, new Date());
      // Show the expired result before allowing another attempt.
      return null;
    }
    const latest = await tx.examAttempt.findFirst({
      where: { userId, version: EXAM_VERSION },
      orderBy: { number: "desc" },
    });
    const now = new Date();
    const attempt = await tx.examAttempt.create({
      data: {
        userId,
        version: EXAM_VERSION,
        number: (latest?.number ?? 0) + 1,
        startedAt: now,
        deadline: new Date(now.getTime() + EXAM_MINUTES * 60000),
        layout: makeLayout() as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "exam_started",
        entityType: "ExamAttempt",
        entityId: attempt.id,
      },
    });
    return activeDTO(attempt);
  });
}

export async function mutateExam(
  userId: string,
  id: string,
  input: unknown,
  submit: boolean,
) {
  return withExamLock(userId, async (tx) => {
    let attempt = await tx.examAttempt.findFirst({ where: { id, userId } });
    if (!attempt) throw new ExamError("Attempt not found.");
    if (attempt.status === "SUBMITTED")
      return {
        result: resultDTO(attempt),
        serverNow: new Date().toISOString(),
      };
    const answers = validAnswers(input, attempt.version);
    if (!answers)
      throw new ExamError("Invalid answer. Reload the page and try again.");
    const now = new Date();
    // Late payloads never overwrite the last answers received before the deadline.
    if (now < attempt.deadline) {
      attempt = await tx.examAttempt.update({
        where: { id },
        data: {
          answers: {
            ...(attempt.answers as Answers),
            ...answers,
          } as Prisma.InputJsonValue,
        },
      });
    }
    if (submit || now >= attempt.deadline)
      return {
        result: resultDTO(await finalize(tx, attempt, now)),
        serverNow: new Date().toISOString(),
      };
    return { result: null, serverNow: now.toISOString() };
  });
}

/** Finalize abandoned attempts when the admin opens the results screen. A
 * student's score is likewise finalized on their next save, submit or visit. */
export async function finalizeExpiredExams() {
  const expired = await db.examAttempt.findMany({
    where: { status: "IN_PROGRESS", deadline: { lte: new Date() } },
    select: { id: true, userId: true },
    take: 100,
  });
  for (const a of expired) await mutateExam(a.userId, a.id, {}, true);
}
