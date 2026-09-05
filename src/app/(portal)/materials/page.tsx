import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authorization";
import { PageHeader } from "@/components/page-header";
import { MaterialsBoard } from "@/features/materials/materials-board";

export const metadata = { title: "Materials" };

export default async function MaterialsPage() {
  const user = await requireUser();
  const canEdit = canAccessAdmin(user.role);

  // File bytes stay in the database; the list only needs their metadata.
  const sessions = await db.cohortSession.findMany({
    where: canEdit ? {} : { isActive: true },
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
  });

  return (
    <>
      <PageHeader
        eyebrow="Live classes"
        title="Materials"
        description={
          canEdit
            ? "Upload the slides, PDFs, and documents for each session. Students can download everything you attach to a published session."
            : "Download the slides and handouts from each session. New files appear here as your instructor posts them."
        }
      />
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
