import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { startExam, mutateExam, loadExam } from "@/features/exam/service";
import {
  issueCertificateAction,
  runExampleAction,
} from "@/features/exam/actions";
import { GET as downloadCertificate } from "@/app/api/exam/certificate/[id]/route";
import { bankForVersion } from "@/features/exam/bank";
const questions = bankForVersion("aiamc-2026-v1");
import { Prisma } from "@prisma/client";

const suite = `exam-workflow-${Date.now()}`;
let a = "",
  b = "";
beforeAll(async () => {
  const students = await Promise.all(
    ["a", "b"].map((name) =>
      db.user.create({
        data: {
          email: `${suite}-${name}@example.test`,
          passwordHash: "unused",
          profile: { create: { fullName: `Exam Student ${name}` } },
        },
      }),
    ),
  );
  [a, b] = students.map((s) => s.id);
});
afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
});

describe("persistent timed exam workflow", () => {
  it("serializes concurrent starts into one 150-minute attempt and keeps students isolated", async () => {
    const [first, duplicate, other] = await Promise.all([
      startExam(a),
      startExam(a),
      startExam(b),
    ]);
    expect(first!.id).toBe(duplicate!.id);
    expect(other!.id).not.toBe(first!.id);
    expect(first!.questions.map((q) => q.id)).not.toEqual(
      other!.questions.map((q) => q.id),
    );
    const row = await db.examAttempt.findUniqueOrThrow({
      where: { id: first!.id },
    });
    expect(row.deadline.getTime() - row.startedAt.getTime()).toBe(150 * 60000);
    await expect(
      mutateExam(b, first!.id, { "practice-01": "o0" }, false),
    ).rejects.toThrow("Attempt not found");
    await Promise.all([
      mutateExam(a, first!.id, { "practice-01": "o0" }, false),
      mutateExam(a, first!.id, { "practice-02": "o0" }, false),
    ]);
    expect((await loadExam(a)).active!.answers).toMatchObject({
      "practice-01": "o0",
      "practice-02": "o0",
    });
    expect((await startExam(a))!.deadline).toBe(first!.deadline);
  });
  it("blocks certification before passing and only runs public examples for the owner", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      id: a,
      role: "STUDENT",
    } as never);
    expect(await issueCertificateAction("Student A")).toMatchObject({
      error: expect.stringContaining("Pass the exam"),
    });
    const other = (await loadExam(b)).active!;
    expect(
      await runExampleAction(
        other.id,
        "practice-fix-1",
        "def identity(value):\n return value",
      ),
    ).toMatchObject({ error: expect.stringContaining("no longer active") });
    expect(
      await issueCertificateAction("<script>alert(1)</script>"),
    ).toHaveProperty("error");
  });
  it("rejects late changes, finalizes idempotently, and allows a retry after failure", async () => {
    const current = (await loadExam(a)).active!;
    await db.examAttempt.update({
      where: { id: current.id },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    const late = await mutateExam(
      a,
      current.id,
      { "practice-01": "o0", "practice-03": "o3" },
      true,
    );
    expect(late.result).toMatchObject({ score: 2, passed: false });
    const row = await db.examAttempt.findUniqueOrThrow({
      where: { id: current.id },
    });
    expect(row.answers).toEqual({ "practice-01": "o0", "practice-02": "o0" });
    expect(row.submittedAt).toEqual(row.deadline);
    expect(await mutateExam(a, current.id, {}, true)).toMatchObject({
      result: { score: 2 },
    });
    expect(
      await db.auditLog.count({
        where: { entityId: current.id, action: "exam_submitted" },
      }),
    ).toBe(1);
    const retry = await startExam(a);
    expect(retry!.number).toBe(2);
    expect(retry!.id).not.toBe(current.id);
  });
  it("auto-finalizes abandoned attempts on resume without accepting new answers", async () => {
    const current = (await loadExam(b)).active!;
    await db.examAttempt.update({
      where: { id: current.id },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    expect(await startExam(b)).toBeNull();
    const state = await loadExam(b);
    expect(state.active).toBeUndefined();
    expect(state.results[0]).toMatchObject({ score: 0, passed: false });
  });
  it("passes at 90, closes retakes, and issues only one immutable credential", async () => {
    const current = (await loadExam(a)).active!;
    const answers = Object.fromEntries(
      questions.slice(10).map((q) => [q.id, q.solution ?? q.correct!]),
    );
    const result = await mutateExam(a, current.id, answers, true);
    expect(result.result).toMatchObject({ score: 90, passed: true });
    await expect(startExam(a)).rejects.toThrow("already passed");
    vi.mocked(requireUser).mockResolvedValue({
      id: a,
      role: "STUDENT",
    } as never);
    const [one, two] = await Promise.all([
      issueCertificateAction("Zoë Engineer"),
      issueCertificateAction("Zoë Engineer"),
    ]);
    expect(one.certificate!.id).toBe(two.certificate!.id);
    expect(
      (await issueCertificateAction("Different Name")).certificate!.name,
    ).toBe("Zoë Engineer");
    expect(await db.examCertificate.count({ where: { userId: a } })).toBe(1);
  });
  it("protects the PDF download and allows the owner and administrator", async () => {
    const c = await db.examCertificate.findUniqueOrThrow({
      where: { userId: a },
    });
    const params = { params: Promise.resolve({ id: c.id }) };
    const request = new Request(
      "http://localhost/api/exam/certificate/" + c.id,
    );
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await downloadCertificate(request, params)).status).toBe(401);
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: b,
      role: "STUDENT",
    } as never);
    expect((await downloadCertificate(request, params)).status).toBe(404);
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: a,
      role: "STUDENT",
    } as never);
    const pdf = await downloadCertificate(request, params);
    expect(pdf.headers.get("Content-Type")).toBe("application/pdf");
    expect(pdf.headers.get("Cache-Control")).toBe("private, no-store");
    expect(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: b,
      role: "ADMIN",
    } as never);
    expect((await downloadCertificate(request, params)).status).toBe(200);
  });
  it("enforces the database-level single-active-attempt invariant", async () => {
    const current = await startExam(b);
    await expect(
      db.examAttempt.create({
        data: {
          userId: b,
          version: "other",
          number: 1,
          deadline: new Date(Date.now() + 10000),
          layout: current!.questions as unknown as Prisma.InputJsonValue,
        },
      }),
    ).rejects.toThrow();
  });
});
