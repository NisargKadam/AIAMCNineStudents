/**
 * Bulk-creates student accounts from CSV text.
 *
 * The file needs a `name` and an `email` column; order and extra columns do not
 * matter. An optional `batch` column holds the batch number ("11"); rows
 * without one join the enrolling batch. Rows without an email, or naming a
 * batch that does not exist, are reported and skipped, and an email that
 * already has an account is left untouched, so the import is safe to re-run.
 *
 *   npm run db:import-students -- ./roster.csv
 *
 * On a host where the database is only reachable from inside the deployment,
 * set STUDENT_ROSTER_CSV_BASE64 to the base64 of the same file and redeploy;
 * the seed runs this on startup. Clear the variable once it has run.
 *
 * Keep roster files out of the repository — they hold personal data.
 */
import { readFileSync } from "node:fs";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { findEnrollingBatch } from "../prisma/batches";

/** Minimal CSV reader: quoted fields, doubled quotes, commas inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

/** Rosters arrive in mixed case; the directory reads better in one style. */
export function titleCase(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) =>
          part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part,
        )
        .join("-"),
    )
    .join(" ");
}

export async function importStudents(prisma: PrismaClient, csv: string) {
  const password = process.env.DEFAULT_STUDENT_PASSWORD;
  if (!password) throw new Error("DEFAULT_STUDENT_PASSWORD is not configured.");

  const rows = parseCsv(csv);
  if (rows.length < 2)
    throw new Error("The file needs a header row and at least one student.");

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const nameIndex = header.indexOf("name");
  const emailIndex = header.indexOf("email");
  const batchIndex = header.indexOf("batch");
  if (nameIndex === -1 || emailIndex === -1)
    throw new Error(
      "The header row must contain a name column and an email column.",
    );

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const actor = adminEmail
    ? await prisma.user.findUnique({ where: { email: adminEmail } })
    : null;

  const enrolling = await findEnrollingBatch(prisma);
  const batches = new Map(
    (await prisma.batch.findMany()).map((batch) => [
      String(batch.number),
      batch,
    ]),
  );

  const created: string[] = [];
  const existing: string[] = [];
  const skipped: string[] = [];
  const unknownBatch: string[] = [];

  for (const row of rows.slice(1)) {
    const name = titleCase(row[nameIndex] ?? "");
    const email = (row[emailIndex] ?? "").trim().toLowerCase();

    if (!name) continue;
    if (!email || !email.includes("@")) {
      skipped.push(name);
      continue;
    }

    const already = await prisma.user.findUnique({ where: { email } });
    if (already) {
      existing.push(email);
      continue;
    }

    // "11", "Batch 11", and "batch-11" all name Batch 11.
    const batchText = (row[batchIndex] ?? "").match(/\d+/)?.[0];
    const batch = batchText
      ? batches.get(String(Number(batchText)))
      : enrolling;
    if (!batch) {
      unknownBatch.push(`${name} (${row[batchIndex]?.trim() || "no batch"})`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.STUDENT,
        batchId: batch.id,
        profile: { create: { fullName: name } },
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action: "student_created",
        entityType: "User",
        entityId: user.id,
        metadata: { email, source: "roster import", batch: batch.number },
      },
    });
    created.push(`${name} <${email}> → Batch ${batch.number}`);
  }

  console.log(`Created ${created.length} accounts:`);
  for (const entry of created) console.log(`  ${entry}`);
  if (existing.length)
    console.log(
      `\nAlready had an account (${existing.length}): ${existing.join(", ")}`,
    );
  if (skipped.length)
    console.log(
      `\nNo email address, so no account was created (${skipped.length}): ${skipped.join(", ")}`,
    );
  if (unknownBatch.length)
    console.log(
      `\nNo such batch, so no account was created (${unknownBatch.length}): ${unknownBatch.join(", ")}`,
    );
  console.log(`\nEveryone created signs in with DEFAULT_STUDENT_PASSWORD.`);

  return {
    created: created.length,
    existing: existing.length,
    skipped,
    unknownBatch,
  };
}

if (process.argv[1]?.includes("import-students")) {
  const file = process.argv[2];
  const prisma = new PrismaClient();
  Promise.resolve()
    .then(() => {
      if (!file)
        throw new Error(
          "Pass the path to a CSV file with name and email columns.",
        );
      return importStudents(prisma, readFileSync(file, "utf8"));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "Import failed");
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
