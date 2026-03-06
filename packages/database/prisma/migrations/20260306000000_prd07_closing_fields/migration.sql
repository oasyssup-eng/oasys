-- PRD-07: Day Closing & Reports — Schema additions

-- DailyReport: new financial breakdown fields
ALTER TABLE "DailyReport" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CLOSED';
ALTER TABLE "DailyReport" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DailyReport" ADD COLUMN "grossRevenue" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "netRevenue" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "totalPayments" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "serviceFees" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "tips" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "discounts" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "cancellationAmount" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "courtesyAmount" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "staffMealAmount" DECIMAL(10,2);
ALTER TABLE "DailyReport" ADD COLUMN "totalChecks" INTEGER;
ALTER TABLE "DailyReport" ADD COLUMN "paidChecks" INTEGER;
ALTER TABLE "DailyReport" ADD COLUMN "openChecks" INTEGER;
ALTER TABLE "DailyReport" ADD COLUMN "rawData" JSONB;

-- HourlyRevenue: dailyReportId FK + checkCount
ALTER TABLE "HourlyRevenue" ADD COLUMN "dailyReportId" TEXT;
ALTER TABLE "HourlyRevenue" ADD COLUMN "checkCount" INTEGER NOT NULL DEFAULT 0;

-- Index for HourlyRevenue → DailyReport FK
CREATE INDEX "HourlyRevenue_dailyReportId_idx" ON "HourlyRevenue"("dailyReportId");

-- Foreign key: HourlyRevenue → DailyReport
ALTER TABLE "HourlyRevenue" ADD CONSTRAINT "HourlyRevenue_dailyReportId_fkey" FOREIGN KEY ("dailyReportId") REFERENCES "DailyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
