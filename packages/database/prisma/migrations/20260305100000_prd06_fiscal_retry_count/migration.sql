-- PRD-06: Add retryCount to FiscalNote for automatic retry tracking
ALTER TABLE "FiscalNote" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

-- Index for efficient checkId lookups
CREATE INDEX "FiscalNote_checkId_idx" ON "FiscalNote"("checkId");
