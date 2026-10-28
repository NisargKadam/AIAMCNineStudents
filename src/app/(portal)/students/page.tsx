import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
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
  const isAdmin = canAccessAdmin(user.role);

  // A student only ever sees their own batch; `?batch=` is ignored for them.
  // Administrators can browse every batch.
  const batches = isAdmin
    ? await db.batch.findMany({
        orderBy: { number: "desc" },
        include: { _count: { select: { students: { where: listed } } } },
      })
    : [];
  const filter = isAdmin
    ? resolveBatchFilter((await searchParams).batch, batches)
    : { key: "own", batchId: user.batchId };
  const viewing = isAdmin
    ? batches.find((batch) => batch.id === filter.batchId)
    : user.batch;

  const students =
    isAdmin || user.batchId
      ? await db.user.findMany({
          where: {
            ...listed,
            ...(filter.batchId !== undefined
              ? { batchId: filter.batchId }
              : {}),
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
        })
      : [];

  const label = viewing ? batchLabel(viewing.number) : null;

  return (
    <>
      <PageHeader
        eyebrow={label ? `Cohort directory · ${label}` : "Cohort directory"}
        title="Meet the builders"
        description={
          isAdmin
            ? label
              ? `Everyone in ${label}. Students only ever see their own batch here.`
              : "Every student in every batch. Students only ever see their own batch here."
            : label
              ? `Everyone learning and shipping alongside you in ${label}. Only what people choose to share appears here.`
              : "You are not in a batch yet, so there is nobody to show. Ask your instructor to add you to one."
        }
      />
      {isAdmin && batches.length > 0 && (
        <LinkTabs
          className="mb-5"
          active={filter.key}
          tabs={[
            {
              key: "all",
              label: "All batches",
              href: "/students",
              count: batches.reduce(
                (sum, batch) => sum + batch._count.students,
                0,
              ),
            },
            ...batches.map((batch) => ({
              key: String(batch.number),
              label: batchLabel(batch.number),
              href: `/students?batch=${batch.number}`,
              count: batch._count.students,
            })),
          ]}
        />
      )}
      <StudentDirectory
        showBatch={isAdmin && !viewing}
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
