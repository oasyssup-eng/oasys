-- AlterEnum: Add SPLIT to CheckStatus
ALTER TYPE "CheckStatus" ADD VALUE 'SPLIT';

-- AlterTable: Add isActive and hasServiceRequest to Table
ALTER TABLE "Table" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Table" ADD COLUMN "hasServiceRequest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Table_unitId_isActive_idx" ON "Table"("unitId", "isActive");

-- AlterTable: Add delivery tracking to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "isDelivered" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "deliveredAt" TIMESTAMP(3);
