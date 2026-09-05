-- CreateEnum
CREATE TYPE "StoredFileKind" AS ENUM ('IMAGE', 'SESSION_MATERIAL');

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "kind" "StoredFileKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredFile_sessionId_createdAt_idx" ON "StoredFile"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoredFile" ADD CONSTRAINT "StoredFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CohortSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
