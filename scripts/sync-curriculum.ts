/**
 * Applies `prisma/curriculum.ts` to a database authoritatively.
 *
 * The seed is deliberately non-destructive so it never removes work an
 * administrator did in the console. When the curriculum itself changes —
 * consolidating the readiness checklist, renaming the projects — run this
 * instead. It renames what should stay, removes what is no longer part of the
 * curriculum, and bumps the checklist version so every student reconfirms.
 *
 *   npm run db:sync-curriculum
 *
 * On a host where the database is only reachable from inside the deployment,
 * set SYNC_CURRICULUM=true and redeploy; the seed runs this on startup.
 */
import { PrismaClient } from "@prisma/client";
import { assignments, categories } from "../prisma/curriculum";

export async function syncCurriculum(prisma: PrismaClient) {
  const removed = { categories: 0, prerequisites: 0 };
  const kept: string[] = [];

  for (const [categoryIndex, category] of categories.entries()) {
    const sortOrder = categoryIndex + 1;
    const saved = await prisma.prerequisiteCategory.upsert({
      where: { sortOrder },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        name: category.name,
        description: category.description,
        sortOrder,
      },
    });
    kept.push(saved.id);

    for (const [itemIndex, [title, verification]] of category.items.entries()) {
      await prisma.prerequisite.upsert({
        where: {
          categoryId_sortOrder: {
            categoryId: saved.id,
            sortOrder: itemIndex + 1,
          },
        },
        update: { title, verification, isActive: true },
        create: {
          categoryId: saved.id,
          title,
          verification,
          sortOrder: itemIndex + 1,
        },
      });
    }

    // Anything past the defined length of this category is no longer part of
    // the curriculum. Student progress against it goes with it.
    const trimmed = await prisma.prerequisite.deleteMany({
      where: { categoryId: saved.id, sortOrder: { gt: category.items.length } },
    });
    removed.prerequisites += trimmed.count;
  }

  const staleCategories = await prisma.prerequisiteCategory.deleteMany({
    where: { id: { notIn: kept } },
  });
  removed.categories = staleCategories.count;

  await prisma.prerequisiteConfig.upsert({
    where: { id: 1 },
    update: { version: { increment: 1 } },
    create: { id: 1, version: 1 },
  });

  for (const [index, [title, description]] of assignments.entries()) {
    await prisma.assignment.upsert({
      where: { sortOrder: index + 1 },
      update: { title, description, isActive: true },
      create: { title, description, sortOrder: index + 1 },
    });
  }

  // Extra projects are hidden rather than deleted, so any submissions against
  // them survive and an administrator can decide what to do with them.
  const hidden = await prisma.assignment.updateMany({
    where: { sortOrder: { gt: assignments.length } },
    data: { isActive: false },
  });

  const config = await prisma.prerequisiteConfig.findUnique({
    where: { id: 1 },
  });
  const totalChecks = categories.reduce((sum, c) => sum + c.items.length, 0);

  console.log(
    [
      `Curriculum synced.`,
      `  ${categories.length} categories, ${totalChecks} readiness checks`,
      `  ${assignments.length} projects`,
      `  removed ${removed.categories} stale categories and ${removed.prerequisites} stale checks`,
      `  hid ${hidden.count} extra projects`,
      `  checklist version is now ${config?.version ?? 1}`,
    ].join("\n"),
  );
}

if (process.argv[1]?.includes("sync-curriculum")) {
  const prisma = new PrismaClient();
  syncCurriculum(prisma)
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Sync failed");
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
