import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { PrerequisiteChecklist } from "@/features/prerequisites/checklist";
export const metadata = { title: "Prerequisites" };
export default async function PrerequisitesPage() {
  const user = await requireUser();
  const [categories, confirmation, config] = await Promise.all([
    db.prerequisiteCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        prerequisites: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            students: {
              where: { userId: user.id },
              select: { completed: true },
            },
          },
        },
      },
    }),
    db.prerequisiteConfirmation.findUnique({ where: { userId: user.id } }),
    db.prerequisiteConfig.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Readiness checklist"
        title="Prerequisites"
        description="Verify every foundation before the cohort moves into agent engineering. Your progress is saved to your account."
      />
      <PrerequisiteChecklist
        currentVersion={config?.version ?? 1}
        confirmation={
          confirmation
            ? {
                confirmedAt: confirmation.confirmedAt.toISOString(),
                confirmedVersion: confirmation.confirmedVersion,
                invalidatedAt:
                  confirmation.invalidatedAt?.toISOString() ?? null,
              }
            : null
        }
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          items: c.prerequisites.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            verification: p.verification,
            completed: p.students[0]?.completed ?? false,
          })),
        }))}
      />
    </>
  );
}
