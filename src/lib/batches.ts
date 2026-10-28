/**
 * Batch helpers for the app. `findEnrollingBatch` is defined next to the seed
 * so the production startup can load it without `src/`.
 */
import type { Prisma, Role } from "@prisma/client";

export { findEnrollingBatch } from "../../prisma/batches";

/**
 * Whose profiles, posts, and comments someone may see. A student sees only
 * their own batch and the instructors; an administrator sees everyone, which
 * is returned as undefined (no filter).
 */
export function visiblePeople(viewer: {
  id: string;
  role: Role;
  batchId: string | null;
}): Prisma.UserWhereInput | undefined {
  if (viewer.role === "ADMIN") return undefined;
  return {
    OR: [
      { role: "ADMIN" },
      { id: viewer.id },
      ...(viewer.batchId
        ? [{ role: "STUDENT" as const, batchId: viewer.batchId }]
        : []),
    ],
  };
}

/**
 * Reads a `?batch=` value. `batchId` is undefined for every batch, null for
 * students without a batch, or the id of the batch whose number matched.
 */
export function resolveBatchFilter(
  value: unknown,
  batches: Array<{ id: string; number: number }>,
): { key: string; batchId: string | null | undefined } {
  if (value === "none") return { key: "none", batchId: null };
  const match = batches.find((batch) => String(batch.number) === value);
  return match
    ? { key: String(match.number), batchId: match.id }
    : { key: "all", batchId: undefined };
}

/**
 * The batch a schedule screen shows an administrator: the one named by
 * `?batch=`, else the enrolling batch, else the newest. Expects newest first.
 */
export function chooseBatch<T extends { number: number; isEnrolling: boolean }>(
  value: unknown,
  batches: T[],
): T | null {
  return (
    batches.find((batch) => String(batch.number) === value) ??
    batches.find((batch) => batch.isEnrolling) ??
    batches[0] ??
    null
  );
}
