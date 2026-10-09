-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'PENDING';

-- Accounts created before approvals existed were already in use
UPDATE "Account" SET "status" = 'ACTIVE', "reviewedAt" = NOW();
