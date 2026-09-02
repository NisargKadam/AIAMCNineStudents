import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { PrerequisiteManager } from "@/features/admin/prerequisite-manager";
export const metadata = { title: "Prerequisites Manager" };
export default async function AdminPrerequisitesPage() {
  const [categories, config] = await Promise.all([
    db.prerequisiteCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { prerequisites: { orderBy: { sortOrder: "asc" } } },
    }),
    db.prerequisiteConfig.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Admin Console"
        title="Prerequisites Manager"
        description="Maintain categories and readiness checks. Definition changes automatically require students to reconfirm."
      />
      <PrerequisiteManager
        currentVersion={config?.version ?? 1}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? "",
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          items: c.prerequisites.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? "",
            verification: p.verification ?? "",
            sortOrder: p.sortOrder,
            isActive: p.isActive,
          })),
        }))}
      />
    </>
  );
}
