import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { StudentManager } from "@/features/admin/student-manager";

export const metadata = { title: "Manage students" };

export default async function AdminStudentsPage() {
  const admin = await requireAdmin();
  const [users, prereqTotal, assignmentTotal] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        prerequisites: {
          where: {
            completed: true,
            prerequisite: { isActive: true, category: { isActive: true } },
          },
        },
        submissions: { where: { status: "COMPLETED" } },
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
        currentAdminId={admin.id}
        students={users.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          name: user.profile?.fullName ?? user.email,
          avatarUrl: user.profile?.avatarUrl ?? null,
          githubUsername: user.profile?.githubUsername ?? null,
          currentRole: user.profile?.currentRole ?? null,
          country: user.profile?.country ?? null,
          joinedAt: user.createdAt.toISOString(),
          prereqDone: user.prerequisites.length,
          prereqTotal,
          assignmentDone: user.submissions.length,
          assignmentTotal,
        }))}
      />
    </>
  );
}
