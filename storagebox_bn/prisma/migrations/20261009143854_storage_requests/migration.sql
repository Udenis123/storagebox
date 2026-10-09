-- CreateEnum
CREATE TYPE "StorageRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "StorageRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "requestedBytes" BIGINT NOT NULL,
    "grantedBytes" BIGINT,
    "reason" TEXT,
    "requestedBy" TEXT NOT NULL,
    "status" "StorageRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorageRequest_accountId_createdAt_idx" ON "StorageRequest"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "StorageRequest_status_idx" ON "StorageRequest"("status");

-- AddForeignKey
ALTER TABLE "StorageRequest" ADD CONSTRAINT "StorageRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
