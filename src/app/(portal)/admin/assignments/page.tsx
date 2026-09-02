import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AssignmentManager } from "@/features/admin/assignment-manager";
export const metadata = { title: "Assignments Manager" };
export default async function AdminAssignmentsPage() {
  const assignments = await db.assignment.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { submissions: true } } },
  });
  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="Assignments Manager"
        description="Rename curriculum items once and every student sees the change. Configure delivery order, due dates, and availability."
      />
      <AssignmentManager
        assignments={assignments.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description ?? "",
          instructions: a.instructions ?? "",
          sortOrder: a.sortOrder,
          dueDate: a.dueDate?.toISOString().slice(0, 10) ?? "",
          isActive: a.isActive,
          submissionCount: a._count.submissions,
        }))}
      />
    </>
  );
}
