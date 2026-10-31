CREATE TYPE "ExamStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');
CREATE TABLE "ExamAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "status" "ExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadline" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "layout" JSONB NOT NULL,
  "answers" JSONB NOT NULL DEFAULT '{}',
  "score" INTEGER,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "breakdown" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExamAttempt_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100),
  CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExamAttempt_userId_version_number_key" ON "ExamAttempt"("userId", "version", "number");
CREATE UNIQUE INDEX "ExamAttempt_one_active_per_user" ON "ExamAttempt"("userId") WHERE "status" = 'IN_PROGRESS';
CREATE INDEX "ExamAttempt_status_deadline_idx" ON "ExamAttempt"("status", "deadline");
CREATE INDEX "ExamAttempt_userId_startedAt_idx" ON "ExamAttempt"("userId", "startedAt" DESC);
CREATE TABLE "ExamCertificate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExamCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExamCertificate_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExamCertificate_userId_key" ON "ExamCertificate"("userId");
CREATE UNIQUE INDEX "ExamCertificate_attemptId_key" ON "ExamCertificate"("attemptId");
