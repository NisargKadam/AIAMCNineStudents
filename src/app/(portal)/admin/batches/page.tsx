import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { BatchManager } from "@/features/admin/batch-manager";
import { pluralize } from "@/lib/utils";

export const metadata = { title: "Batches" };

export default async function AdminBatchesPage() {
  await requireAdmin();
  const now = new Date();
  const [batches, activeCounts, recordingCounts, nextSessions, unassigned] =
    await Promise.all([
      db.batch.findMany({
        orderBy: { number: "desc" },
        include: {
          _count: {
            select: {
              students: { where: { role: "STUDENT" } },
              sessions: true,
            },
          },
        },
      }),
      db.user.groupBy({
        by: ["batchId"],
        where: { role: "STUDENT", isActive: true },
        _count: { _all: true },
      }),
      db.cohortSession.groupBy({
        by: ["batchId"],
        where: { recordingUrl: { not: null } },
        _count: { _all: true },
      }),
      db.cohortSession.groupBy({
        by: ["batchId"],
        where: { isActive: true, scheduledAt: { gt: now } },
        _min: { scheduledAt: true },
      }),
      db.user.count({ where: { role: "STUDENT", batchId: null } }),
    ]);
  const submissions = await Promise.all(
    batches.map((batch) =>
      db.assignmentSubmission.count({ where: { user: { batchId: batch.id } } }),
    ),
  );

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Batches"
        description="Each intake of the masterclass is a batch with its own students and live-session schedule. New students join the enrolling batch."
      />
      {unassigned > 0 && (
        <Card
          tone="raised"
          className="mb-4 flex flex-wrap items-center gap-3 border-[color-mix(in_oklab,var(--caution)_35%,var(--line))] p-4"
        >
          <CircleAlert size={17} className="text-[var(--caution)]" />
          <p className="text-ink text-sm font-semibold">
            {unassigned} {pluralize(unassigned, "student is", "students are")}{" "}
            not in any batch
          </p>
          <Link
            href="/admin/students?batch=none"
            className="text-ember text-xs hover:underline"
          >
            Assign them a batch
          </Link>
        </Card>
      )}
      <BatchManager
        batches={batches.map((batch, index) => ({
          id: batch.id,
          number: batch.number,
          isEnrolling: batch.isEnrolling,
          students: batch._count.students,
          activeStudents:
            activeCounts.find((row) => row.batchId === batch.id)?._count._all ??
            0,
          sessions: batch._count.sessions,
          recordings:
            recordingCounts.find((row) => row.batchId === batch.id)?._count
              ._all ?? 0,
          submissions: submissions[index],
          nextSessionAt:
            nextSessions
              .find((row) => row.batchId === batch.id)
              ?._min.scheduledAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
