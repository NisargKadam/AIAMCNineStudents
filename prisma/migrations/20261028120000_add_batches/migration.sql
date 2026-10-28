-- Batches: every student belongs to one intake of the masterclass, and each
-- intake keeps its own live-session schedule.
--
-- Everyone enrolled before this migration is Batch 9. Batch 11 is created as
-- the enrolling batch, so students added from now on join it. Batch 11 starts
-- with the same session titles as Batch 9 but none of its dates, join links,
-- recordings, or materials.

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "isEnrolling" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Batch_number_key" ON "Batch"("number");

-- The two batches the portal starts with.
INSERT INTO "Batch" ("id", "number", "isEnrolling", "updatedAt") VALUES
    ('batch9', 9, false, CURRENT_TIMESTAMP),
    ('batch11', 11, true, CURRENT_TIMESTAMP);

-- AlterTable: every existing student is Batch 9. Administrators have no batch.
ALTER TABLE "User" ADD COLUMN "batchId" TEXT;
UPDATE "User" SET "batchId" = 'batch9' WHERE "role" = 'STUDENT';

-- DropIndex: session numbers are now unique per batch, not globally.
DROP INDEX "CohortSession_isActive_sortOrder_idx";
DROP INDEX "CohortSession_sortOrder_key";

-- AlterTable: the existing schedule, links, recordings, and materials are Batch 9's.
ALTER TABLE "CohortSession" ADD COLUMN "batchId" TEXT;
UPDATE "CohortSession" SET "batchId" = 'batch9';
ALTER TABLE "CohortSession" ALTER COLUMN "batchId" SET NOT NULL;

-- Batch 11 gets the same session titles, ready for its own dates and links.
INSERT INTO "CohortSession" ("id", "batchId", "sortOrder", "title", "isActive", "createdAt", "updatedAt")
SELECT
    'c' || replace(gen_random_uuid()::text, '-', ''),
    'batch11',
    "sortOrder",
    "title",
    "isActive",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "CohortSession"
WHERE "batchId" = 'batch9';

-- CreateIndex
CREATE INDEX "CohortSession_batchId_isActive_sortOrder_idx" ON "CohortSession"("batchId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CohortSession_batchId_sortOrder_key" ON "CohortSession"("batchId", "sortOrder");

-- CreateIndex
CREATE INDEX "User_batchId_role_idx" ON "User"("batchId", "role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortSession" ADD CONSTRAINT "CohortSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
