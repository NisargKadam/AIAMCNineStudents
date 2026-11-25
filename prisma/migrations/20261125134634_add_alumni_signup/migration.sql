-- CreateEnum
CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'DECLINED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "alumniBatch" INTEGER;

-- CreateTable
CREATE TABLE "PreapprovedEmail" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreapprovedEmail_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "SignupRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "alumniBatch" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "SignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupRequest_email_key" ON "SignupRequest"("email");

-- CreateIndex
CREATE INDEX "SignupRequest_status_createdAt_idx" ON "SignupRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "User_alumniBatch_idx" ON "User"("alumniBatch");
