import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { StudentManager } from "@/features/admin/student-manager";

export const metadata = { title: "Manage students" };

export default async function AdminStudentsPage() {
  await requireAdmin();
  const [users, prereqTotal, assignmentTotal] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        passwordResetRequest: true,
        prerequisites: {
          where: {
            completed: true,
            prerequisite: { isActive: true, category: { isActive: true } },
          },
        },
        submissions: {
          select: { status: true, assignment: { select: { isActive: true } } },
        },
      },
    }),
    db.prerequisite.count({
      where: { isActive: true, category: { isActive: true } },
    }),
    db.assignment.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Student management"
        description="Add accounts, edit details, control access, set passwords, and remove people who are no longer in the cohort."
      />
      <StudentManager
        students={users.map((user) => ({
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          name: user.profile?.fullName ?? user.email,
          avatarUrl: user.profile?.avatarUrl ?? null,
          githubUsername: user.profile?.githubUsername ?? null,
          currentRole: user.profile?.currentRole ?? null,
          country: user.profile?.country ?? null,
          joinedAt: user.createdAt.toISOString(),
          resetRequestedAt:
            user.passwordResetRequest?.requestedAt.toISOString() ?? null,
          prereqDone: user.prerequisites.length,
          prereqTotal,
          approvedCount: user.submissions.filter(
            (submission) =>
              submission.status === "COMPLETED" &&
              submission.assignment.isActive,
          ).length,
          submittedCount: user.submissions.filter(
            (submission) => submission.assignment.isActive,
          ).length,
          awaitingReviewCount: user.submissions.filter(
            (submission) =>
              submission.status === "SUBMITTED" &&
              submission.assignment.isActive,
          ).length,
          assignmentTotal,
        }))}
      />
    </>
  );
}
