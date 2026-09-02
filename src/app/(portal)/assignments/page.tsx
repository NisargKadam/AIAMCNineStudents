import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { AssignmentBoard } from "@/features/assignments/assignment-board";
export const metadata = { title: "Assignments" };
export default async function AssignmentsPage() {
  const user = await requireUser();
  const assignments = await db.assignment.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { submissions: { where: { userId: user.id } } },
  });
  return (
    <>
      <PageHeader
        eyebrow="Build in public"
        title="Assignments"
        description="Submit your GitHub work, track reviews, and act on instructor feedback."
      />
      <AssignmentBoard
        assignments={assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          instructions: a.instructions,
          sortOrder: a.sortOrder,
          dueDate: a.dueDate?.toISOString() ?? null,
          submission: a.submissions[0]
            ? {
                ...a.submissions[0],
                submittedAt: a.submissions[0].submittedAt.toISOString(),
                updatedAt: a.submissions[0].updatedAt.toISOString(),
                reviewedAt: a.submissions[0].reviewedAt?.toISOString() ?? null,
                completedAt:
                  a.submissions[0].completedAt?.toISOString() ?? null,
              }
            : null,
        }))}
      />
    </>
  );
}
