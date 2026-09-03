import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { assignments, categories, sessionCount } from "./curriculum";
import { importStudents } from "../scripts/import-students";
import { syncCurriculum } from "../scripts/sync-curriculum";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword)
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed safely.",
    );
  if (adminPassword.length < 12)
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      profile: { create: { fullName: "AI AMC Administrator" } },
    },
  });

  await prisma.prerequisiteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, version: 1 },
  });
  for (const [categoryIndex, category] of categories.entries()) {
    const savedCategory = await prisma.prerequisiteCategory.upsert({
      where: { sortOrder: categoryIndex + 1 },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        name: category.name,
        description: category.description,
        sortOrder: categoryIndex + 1,
      },
    });
    for (const [itemIndex, [title, verification]] of category.items.entries()) {
      await prisma.prerequisite.upsert({
        where: {
          categoryId_sortOrder: {
            categoryId: savedCategory.id,
            sortOrder: itemIndex + 1,
          },
        },
        update: { title, verification, isActive: true },
        create: {
          categoryId: savedCategory.id,
          title,
          verification,
          sortOrder: itemIndex + 1,
        },
      });
    }
  }

  for (const [index, [title, description]] of assignments.entries()) {
    const sortOrder = index + 1;
    const existing = await prisma.assignment.findUnique({
      where: { sortOrder },
    });
    // Only rewrite the placeholder titles from earlier seeds; anything an
    // administrator has renamed is left exactly as they set it.
    const isPlaceholder = existing?.title === `Assignment ${sortOrder}`;
    await prisma.assignment.upsert({
      where: { sortOrder },
      update: isPlaceholder ? { title, description } : {},
      create: { title, description, sortOrder },
    });
  }

  for (let sortOrder = 1; sortOrder <= sessionCount; sortOrder += 1) {
    await prisma.cohortSession.upsert({
      where: { sortOrder },
      update: {},
      create: { sortOrder, title: `Session ${sortOrder}` },
    });
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    const studentPassword = process.env.DEFAULT_STUDENT_PASSWORD;
    if (!studentPassword)
      throw new Error("DEFAULT_STUDENT_PASSWORD is required for demo data.");
    const demoHash = await bcrypt.hash(studentPassword, 12);
    await prisma.user.upsert({
      where: { email: "student@aiamc.dev" },
      update: {},
      create: {
        email: "student@aiamc.dev",
        passwordHash: demoHash,
        profile: {
          create: {
            fullName: "Demo Student",
            githubUsername: "octocat",
            currentRole: "AI Engineer",
          },
        },
      },
    });
  }
  console.log(
    `Seed complete: 1 admin, ${categories.length} prerequisite categories, ${assignments.length} projects, ${sessionCount} sessions.`,
  );

  await runDeployTasks();
}

/**
 * One-off maintenance for hosts where the database is only reachable from
 * inside the deployment. Both tasks are opt-in and do nothing unless the
 * corresponding variable is set, so a normal deploy is unaffected. Clear the
 * variable once the task has run.
 */
async function runDeployTasks() {
  if (process.env.SYNC_CURRICULUM === "true") {
    console.log("SYNC_CURRICULUM is set — applying the curriculum.");
    await syncCurriculum(prisma);
  }

  const roster = process.env.STUDENT_ROSTER_CSV_BASE64;
  if (roster) {
    console.log("STUDENT_ROSTER_CSV_BASE64 is set — importing students.");
    await importStudents(
      prisma,
      Buffer.from(roster, "base64").toString("utf8"),
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
