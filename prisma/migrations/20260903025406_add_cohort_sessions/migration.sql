-- CreateTable
CREATE TABLE "CohortSession" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(1000),
    "scheduledAt" TIMESTAMP(3),
    "joinUrl" TEXT,
    "recordingUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CohortSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CohortSession_sortOrder_key" ON "CohortSession"("sortOrder");

-- CreateIndex
CREATE INDEX "CohortSession_isActive_sortOrder_idx" ON "CohortSession"("isActive", "sortOrder");
