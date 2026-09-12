import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import SubmissionsPage from "@/app/(portal)/admin/submissions/page";
import StudentRecordPage from "@/app/(portal)/admin/students/[id]/page";
import AdminStudentsPage from "@/app/(portal)/admin/students/page";

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: "test-admin" }),
}));
vi.mock("@/features/admin/review-submission", () => ({
  ReviewSubmission: () => "Review controls",
}));
vi.mock("@/features/admin/student-manager", () => ({
  StudentManager: ({ students }: { students: unknown }) =>
    JSON.stringify(students),
}));

const suite = `submission-view-${Date.now()}`;
let studentId = "";
let hiddenTitle = "";

beforeAll(async () => {
  const student = await db.user.create({
    data: {
      email: `${suite}@example.test`,
      passwordHash: "unused-test-fixture",
      profile: { create: { fullName: suite } },
    },
  });
  studentId = student.id;
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
  await db.user.deleteMany({ where: { email: `${suite}@example.test` } });
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
  });

  it("reports submissions separately from approvals in the roster", async () => {
    const html = renderToStaticMarkup(await AdminStudentsPage());
    expect(html).toContain(
      "&quot;assignmentDone&quot;:0,&quot;submissionCount&quot;:2",
    );
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
