import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Batch lookups shared by the app, the seed, and the roster import. This lives
 * in `prisma/` because the production image ships `prisma/` and `scripts/` for
 * the startup seed, but not `src/`.
 */
type Client = PrismaClient | Prisma.TransactionClient;

/** Where new students go: the enrolling batch, or the newest one if none is. */
export async function findEnrollingBatch(client: Client) {
  return (
    (await client.batch.findFirst({
      where: { isEnrolling: true },
      orderBy: { number: "desc" },
    })) ?? (await client.batch.findFirst({ orderBy: { number: "desc" } }))
  );
}
