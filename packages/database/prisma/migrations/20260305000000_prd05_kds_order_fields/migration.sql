-- PRD-05: KDS & Producao — Add order fields for kitchen display system

-- Courtesy tracking
ALTER TABLE "Order" ADD COLUMN "isCortesia" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "cortesiaReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "cortesiaAuthorizedBy" TEXT;

-- Staff meal tracking
ALTER TABLE "Order" ADD COLUMN "staffMealEmployeeId" TEXT;

-- Multi-station bump progress (JSON: { "BAR": true, "KITCHEN": false })
ALTER TABLE "Order" ADD COLUMN "stationCompletions" JSONB;
