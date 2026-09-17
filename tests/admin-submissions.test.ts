import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { createStudentAction } from "@/features/admin/actions";
import { requestPasswordResetAction } from "@/features/auth/actions";
import SubmissionsPage from "@/app/(portal)/admin/submissions/page";
import StudentRecordPage from "@/app/(portal)/admin/students/[id]/page";
import AdminStudentsPage from "@/app/(portal)/admin/students/page";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "test-admin" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/admin/review-submission", () => ({
  ReviewSubmission: () => "Review controls",
}));
vi.mock("@/features/admin/student-manager", () => ({
  StudentManager: ({ students }: { students: unknown }) =>
    JSON.stringify(students),
}));

const suite = `submission-view-${Date.now()}`;
let studentId = "";
let adminId = "";
let hiddenTitle = "";

beforeAll(async () => {
  const [student, admin] = await Promise.all([
    db.user.create({
      data: {
        email: `${suite}@example.test`,
        passwordHash: "unused-test-fixture",
        profile: { create: { fullName: suite } },
      },
    }),
    db.user.create({
      data: {
        email: `${suite}-admin@example.test`,
        passwordHash: "unused-test-fixture",
        role: Role.ADMIN,
        profile: { create: { fullName: `${suite} administrator` } },
      },
    }),
  ]);
  studentId = student.id;
  adminId = admin.id;
  vi.mocked(requireAdmin).mockResolvedValue({ id: adminId } as never);
  const max = await db.assignment.aggregate({ _max: { sortOrder: true } });
  for (const [index, isActive] of [true, false].entries()) {
    const title = `${suite} ${isActive ? "active" : "hidden"}`;
    if (!isActive) hiddenTitle = title;
    await db.assignment.create({
      data: {
        title,
        sortOrder: (max._max.sortOrder ?? 0) + index + 100,
        isActive,
        submissions: {
          create: {
            userId: studentId,
            githubUrl: `https://github.com/test/${suite}-${index}`,
            studentNote: "Work is ready for review",
          },
        },
      },
    });
  }
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: suite } } });
  await db.assignment.deleteMany({ where: { title: { startsWith: suite } } });
  await db.$disconnect();
});

describe("admin submission views", () => {
  it("shows submitted work from active and hidden assignments with the correct student", async () => {
    const html = renderToStaticMarkup(
      await SubmissionsPage({ searchParams: Promise.resolve({ q: suite }) }),
    );
    expect(html).toContain("2 matching");
    expect(html).toContain(hiddenTitle);
    expect(html).toContain("Hidden assignment");
    expect(html).toContain(`/admin/students/${studentId}?tab=assignments`);
    expect(html).toContain(`https://github.com/test/${suite}-0`);
    expect(html).toContain(`https://github.com/test/${suite}-1`);
    expect(html).toContain("Work is ready for review");
  });

  it("keeps hidden assignment submissions visible in the student's record", async () => {
    const html = renderToStaticMarkup(
      await StudentRecordPage({
        params: Promise.resolve({ id: studentId }),
        searchParams: Promise.resolve({ tab: "assignments" }),
      }),
    );
    expect(html).toContain(hiddenTitle);
    expect(html).toContain(`https://github.com/test/${suite}-1`);
    const activeTotal = await db.assignment.count({
      where: { isActive: true },
    });
    const overview = renderToStaticMarkup(
      await StudentRecordPage({
        params: Promise.resolve({ id: studentId }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(overview).toContain(`Projects submitted 1/${activeTotal}`);
  });

  it("reports submitted, approved, and awaiting-review counts in the roster", async () => {
    const html = renderToStaticMarkup(await AdminStudentsPage());
    expect(html).toContain(
      "&quot;approvedCount&quot;:0,&quot;submittedCount&quot;:1,&quot;awaitingReviewCount&quot;:1",
    );
    expect(html).not.toContain(`${suite}-admin@example.test`);
  });

  it("records a forgot-password request for the matching student", async () => {
    const form = new FormData();
    form.set("email", ` ${suite.toUpperCase()}@EXAMPLE.TEST `);
    const result = await requestPasswordResetAction(null, form);
    const request = await db.passwordResetRequest.findUnique({
      where: { userId: studentId },
    });

    expect(result.success).toContain("Request received");
    expect(request?.userId).toBe(studentId);
    const roster = renderToStaticMarkup(await AdminStudentsPage());
    expect(roster).toContain("resetRequestedAt");
  });

  it("recovers an existing student login without losing submitted work", async () => {
    await db.user.update({
      where: { id: studentId },
      data: { isActive: false },
    });
    await db.session.create({
      data: {
        userId: studentId,
        tokenHash: `${suite}-session`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const result = await createStudentAction({
      fullName: `${suite} recovered`,
      email: `${suite}@example.test`,
      githubUsername: "recovered-student",
      password: "RecoveredPass123",
    });
    const recovered = await db.user.findUniqueOrThrow({
      where: { id: studentId },
      include: {
        profile: true,
        submissions: true,
        sessions: true,
        passwordResetRequest: true,
      },
    });

    expect(result.success).toContain(
      "existing submissions and progress were kept",
    );
    expect(recovered.isActive).toBe(true);
    expect(recovered.profile?.fullName).toBe(`${suite} recovered`);
    expect(recovered.submissions).toHaveLength(2);
    expect(recovered.sessions).toHaveLength(0);
    expect(recovered.passwordResetRequest).toBeNull();
    expect(
      await bcrypt.compare("RecoveredPass123", recovered.passwordHash),
    ).toBe(true);
  });

  it("distinguishes an empty filtered result from no submissions", async () => {
    const html = renderToStaticMarkup(
      await SubmissionsPage({
        searchParams: Promise.resolve({ q: suite, status: "COMPLETED" }),
      }),
    );
    expect(html).toContain("0 matching");
    expect(html).toContain("No submissions match these filters");
  });

  it("handles invalid status and page parameters without hiding submissions", async () => {
    const html = renderToStaticMarkup(
      await SubmissionsPage({
        searchParams: Promise.resolve({
          q: suite,
          status: "invalid",
          page: "Infinity",
        }),
      }),
    );
    expect(html).toContain("2 matching");
  });

  it("rejects non-admin access before querying submissions", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Unauthorized"));
    const query = vi.spyOn(db.assignmentSubmission, "count");
    await expect(
      SubmissionsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("Unauthorized");
    expect(query).not.toHaveBeenCalled();
    query.mockRestore();
  });
});
