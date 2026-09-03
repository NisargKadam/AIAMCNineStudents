/**
 * Bulk-creates student accounts from a CSV file.
 *
 * The file needs a `name` and an `email` column; order and extra columns do not
 * matter. Rows without an email are reported and skipped, and an email that
 * already has an account is left untouched, so the import is safe to re-run.
 *
 *   npm run db:import-students -- ./roster.csv
 *   railway run npm run db:import-students -- ./roster.csv
 *
 * Keep roster files out of the repository — they hold personal data.
 */
import { readFileSync } from "node:fs";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Minimal CSV reader: quoted fields, doubled quotes, commas inside quotes. */
function parseCsv(text: string): string[][] {
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
function titleCase(name: string) {
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

async function main() {
  const file = process.argv[2];
  if (!file)
    throw new Error("Pass the path to a CSV file with name and email columns.");

  const password = process.env.DEFAULT_STUDENT_PASSWORD;
  if (!password) throw new Error("DEFAULT_STUDENT_PASSWORD is not configured.");

  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length < 2)
    throw new Error("The file needs a header row and at least one student.");

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const nameIndex = header.indexOf("name");
  const emailIndex = header.indexOf("email");
  if (nameIndex === -1 || emailIndex === -1)
    throw new Error(
      "The header row must contain a name column and an email column.",
    );

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const actor = adminEmail
    ? await prisma.user.findUnique({ where: { email: adminEmail } })
    : null;

  const created: string[] = [];
  const existing: string[] = [];
  const skipped: string[] = [];

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

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.STUDENT,
        profile: { create: { fullName: name } },
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action: "student_created",
        entityType: "User",
        entityId: user.id,
        metadata: { email, source: "roster import" },
      },
    });
    created.push(`${name} <${email}>`);
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
  console.log(`\nEveryone created signs in with DEFAULT_STUDENT_PASSWORD.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Import failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
