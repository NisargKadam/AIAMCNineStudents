import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
import { chooseBatch } from "@/lib/batches";
import { batchLabel } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { MaterialsBoard } from "@/features/materials/materials-board";

export const metadata = { title: "Materials" };

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const user = await requireUser();
  const canEdit = canAccessAdmin(user.role);

  // Materials hang off sessions, so they follow the same batch as the schedule.
  const batches = canEdit
    ? await db.batch.findMany({ orderBy: { number: "desc" } })
    : [];
  const batch = canEdit
    ? chooseBatch((await searchParams).batch, batches)
    : user.batch;
  const label = batch ? batchLabel(batch.number) : null;

  // File bytes stay in the database; the list only needs their metadata.
  const sessions = batch
    ? await db.cohortSession.findMany({
        where: canEdit
          ? { batchId: batch.id }
          : { batchId: batch.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          title: true,
          scheduledAt: true,
          isActive: true,
          materials: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              fileName: true,
              contentType: true,
              size: true,
              createdAt: true,
            },
          },
        },
      })
    : [];

  return (
    <>
      <PageHeader
        eyebrow={label ? `Live classes · ${label}` : "Live classes"}
        title="Materials"
        description={
          canEdit
            ? `Upload the slides, PDFs, and documents for each of ${label ?? "the batch"}'s sessions. Students in that batch can download everything you attach to a published session.`
            : label
              ? `Download the slides and handouts from ${label}'s sessions. New files appear here as your instructor posts them.`
              : "You are not in a batch yet, so there are no materials to show. Ask your instructor to add you to one."
        }
      />
      {canEdit && batches.length > 0 && (
        <LinkTabs
          className="mb-5"
          active={batch ? String(batch.number) : ""}
          tabs={batches.map((option) => ({
            key: String(option.number),
            label: option.isEnrolling
              ? `${batchLabel(option.number)} · enrolling`
              : batchLabel(option.number),
            href: `/materials?batch=${option.number}`,
          }))}
        />
      )}
      <MaterialsBoard
        canEdit={canEdit}
        sessions={sessions.map((session) => ({
          id: session.id,
          sortOrder: session.sortOrder,
          title: session.title,
          scheduledAt: session.scheduledAt?.toISOString() ?? null,
          isActive: session.isActive,
          materials: session.materials.map((file) => ({
            id: file.id,
            fileName: file.fileName,
            contentType: file.contentType,
            size: file.size,
            createdAt: file.createdAt.toISOString(),
          })),
        }))}
      />
    </>
  );
}
