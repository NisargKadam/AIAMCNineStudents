import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StudentManager } from "@/features/admin/student-manager";
export const metadata = { title: "Manage Students" };
export default async function AdminStudentsPage() {
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
        eyebrow="Admin Console"
        title="Student management"
        description="Create accounts, review progress, control access, and reset credentials without exposing passwords."
      />
      <StudentManager
        students={users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          name: u.profile?.fullName ?? u.email,
          avatarUrl: u.profile?.avatarUrl ?? null,
          githubUsername: u.profile?.githubUsername ?? null,
          prereqDone: u.prerequisites.length,
          prereqTotal,
          assignmentDone: u.submissions.length,
          assignmentTotal,
        }))}
      />
    </>
  );
}
