import type { Role } from "@prisma/client";
import { batchLabel } from "@/lib/utils";

/**
 * Batches that ran before the portal existed. Their students sign themselves
 * up for certification only, so these are labels on a user and never `Batch`
 * rows with a schedule.
 */
export const ALUMNI_BATCHES: readonly number[] = Array.from(
  { length: 10 },
  (_, index) => index + 1,
);

/**
 * A certification-only account: the exam, the alumni community, and their own
 * profile. Administrators are never alumni, whatever batch they once named.
 */
export function isAlumni(user: { role: Role; alumniBatch: number | null }) {
  return user.role === "STUDENT" && user.alumniBatch !== null;
}

export function alumniLabel(batch: number) {
  return `${batchLabel(batch)} alumni`;
}

/** "Batch 7 alumni", "Batch 11", or null for administrators and the unassigned. */
export function memberBadge(user: {
  role: Role;
  alumniBatch: number | null;
  batch?: { number: number } | null;
}) {
  if (user.role !== "STUDENT") return null;
  if (user.alumniBatch !== null) return alumniLabel(user.alumniBatch);
  return user.batch ? batchLabel(user.batch.number) : null;
}
