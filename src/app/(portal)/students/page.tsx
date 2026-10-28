import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveBatchFilter } from "@/lib/batches";
import { batchLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { StudentDirectory } from "@/features/students/directory";

export const metadata = { title: "Students" };

const listed = {
  isActive: true,
  role: "STUDENT",
  profile: { isNot: null },
} as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const user = await requireUser();
  const batches = await db.batch.findMany({
    orderBy: { number: "desc" },
    include: { _count: { select: { students: { where: listed } } } },
  });
  // Students open on their own batch; every batch is one tab away.
  const own = user.batch ? String(user.batch.number) : "all";
  const filter = resolveBatchFilter((await searchParams).batch ?? own, batches);
  const viewing = batches.find((batch) => batch.id === filter.batchId);

  const students = await db.user.findMany({
    where: {
      ...listed,
      ...(filter.batchId !== undefined ? { batchId: filter.batchId } : {}),
    },
    orderBy: { profile: { fullName: "asc" } },
    select: {
      id: true,
      batch: { select: { number: true } },
      profile: {
        select: {
          fullName: true,
          githubUsername: true,
          linkedinUrl: true,
          currentRole: true,
          country: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={
          viewing
            ? `Cohort directory · ${batchLabel(viewing.number)}`
            : "Cohort directory"
        }
        title="Meet the builders"
        description={
          viewing && viewing.id === user.batchId
            ? `Everyone learning and shipping alongside you in ${batchLabel(viewing.number)}. Only what people choose to share appears here.`
            : viewing
              ? `The builders of ${batchLabel(viewing.number)}. Only what people choose to share appears here.`
              : "Builders from every batch of the masterclass. Only what people choose to share appears here."
        }
      />
      {batches.length > 0 && (
        <LinkTabs
          className="mb-5"
          active={filter.key}
          tabs={[
            ...batches.map((batch) => ({
              key: String(batch.number),
              label:
                batch.id === user.batchId
                  ? `${batchLabel(batch.number)} · yours`
                  : batchLabel(batch.number),
              href: `/students?batch=${batch.number}`,
              count: batch._count.students,
            })),
            {
              key: "all",
              label: "Everyone",
              href: "/students?batch=all",
              count: batches.reduce(
                (sum, batch) => sum + batch._count.students,
                0,
              ),
            },
          ]}
        />
      )}
      <StudentDirectory
        showBatch={!viewing}
        students={students.flatMap((student) =>
          student.profile
            ? [
                {
                  id: student.id,
                  batch: student.batch?.number ?? null,
                  ...student.profile,
                },
              ]
            : [],
        )}
      />
    </>
  );
}
