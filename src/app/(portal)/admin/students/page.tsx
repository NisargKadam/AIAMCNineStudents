import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { resolveBatchFilter } from "@/lib/batches";
import { batchLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { StudentManager } from "@/features/admin/student-manager";

export const metadata = { title: "Manage students" };

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  await requireAdmin();
  const batches = await db.batch.findMany({ orderBy: { number: "desc" } });
  const filter = resolveBatchFilter((await searchParams).batch, batches);

  const [users, prereqTotal, assignmentTotal, batchCounts] = await Promise.all([
    db.user.findMany({
      where: {
        role: "STUDENT",
        ...(filter.batchId !== undefined ? { batchId: filter.batchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        batch: { select: { id: true, number: true } },
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
    db.user.groupBy({
      by: ["batchId"],
      where: { role: "STUDENT" },
      _count: { _all: true },
    }),
  ]);

  const countFor = (batchId: string | null) =>
    batchCounts.find((row) => row.batchId === batchId)?._count._all ?? 0;
  const unassigned = countFor(null);
  const viewing = batches.find((batch) => batch.id === filter.batchId);

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title={
          viewing
            ? `${batchLabel(viewing.number)} students`
            : "Student management"
        }
        description="Add accounts, edit details, control access, set passwords, move people between batches, and remove people who are no longer in the cohort."
      />
      <LinkTabs
        className="mb-5"
        active={filter.key}
        tabs={[
          {
            key: "all",
            label: "All batches",
            href: "/admin/students",
            count: batchCounts.reduce((sum, row) => sum + row._count._all, 0),
          },
          ...batches.map((batch) => ({
            key: String(batch.number),
            label: batch.isEnrolling
              ? `${batchLabel(batch.number)} · enrolling`
              : batchLabel(batch.number),
            href: `/admin/students?batch=${batch.number}`,
            count: countFor(batch.id),
          })),
          ...(unassigned > 0 || filter.key === "none"
            ? [
                {
                  key: "none",
                  label: "No batch",
                  href: "/admin/students?batch=none",
                  count: unassigned,
                },
              ]
            : []),
        ]}
      />
      <StudentManager
        batches={batches.map((batch) => ({
          id: batch.id,
          number: batch.number,
          isEnrolling: batch.isEnrolling,
        }))}
        viewingBatch={viewing?.number ?? null}
        students={users.map((user) => ({
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          name: user.profile?.fullName ?? user.email,
          avatarUrl: user.profile?.avatarUrl ?? null,
          githubUsername: user.profile?.githubUsername ?? null,
          currentRole: user.profile?.currentRole ?? null,
          country: user.profile?.country ?? null,
          batchId: user.batch?.id ?? null,
          batchNumber: user.batch?.number ?? null,
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
