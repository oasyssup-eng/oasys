-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'WAITER', 'BARTENDER', 'CASHIER', 'KITCHEN');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'VOUCHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPolicy" AS ENUM ('PRE_PAYMENT', 'POST_PAYMENT', 'HYBRID');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'LOSS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "FiscalNoteStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'ORDER_DELAYED', 'CASH_REGISTER_OPEN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_READY', 'ORDER_NEW', 'TABLE_REQUEST', 'PAYMENT_CONFIRMED', 'STOCK_LOW', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('MARKETING_WHATSAPP', 'MARKETING_EMAIL', 'MARKETING_SMS', 'DATA_PROCESSING');

-- CreateEnum
CREATE TYPE "WhatsAppSessionState" AS ENUM ('GREETING', 'BROWSING_MENU', 'BUILDING_ORDER', 'AWAITING_PAYMENT', 'ORDER_CONFIRMED', 'FEEDBACK', 'IDLE', 'ENDED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "cnpj" TEXT,
    "stateRegistration" TEXT,
    "legalName" TEXT,
    "streetAddress" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "ibgeCode" TEXT,
    "orderPolicy" "OrderPolicy" NOT NULL DEFAULT 'POST_PAYMENT',
    "serviceFeeRate" DECIMAL(5,4),
    "tipSuggestions" TEXT,
    "operatingHoursStart" TEXT,
    "operatingHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pin" TEXT NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "phone" TEXT,
    "phoneHash" TEXT,
    "name" TEXT,
    "email" TEXT,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerConsent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "state" "WhatsAppSessionState" NOT NULL DEFAULT 'GREETING',
    "context" JSONB,
    "checkId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Layout" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "svgData" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "zoneId" TEXT,
    "number" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "label" TEXT,
    "posX" DOUBLE PRECISION,
    "posY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "imageUrl" TEXT,
    "preparationTime" INTEGER,
    "station" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "tableId" TEXT,
    "customerId" TEXT,
    "employeeId" TEXT NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'OPEN',
    "totalAmount" DECIMAL(10,2),
    "serviceFeeAmount" DECIMAL(10,2),
    "tipAmount" DECIMAL(10,2),
    "discountAmount" DECIMAL(10,2),
    "discountReason" TEXT,
    "splitParentId" TEXT,
    "mergedIntoId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "employeeId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderNumber" INTEGER,
    "courseType" TEXT,
    "holdUntil" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "modifiers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "employeeId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "pixQrCode" TEXT,
    "pixQrCodeBase64" TEXT,
    "paymentUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "cashRegisterId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cancellation" (
    "id" TEXT NOT NULL,
    "checkId" TEXT,
    "orderId" TEXT,
    "orderItemId" TEXT,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(10,2),
    "authorizedBy" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "employeeId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OPERATOR',
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(10,2),
    "expectedBalance" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "closingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashRegisterOperation" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "authorizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegisterOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unitType" TEXT NOT NULL,
    "minQuantity" DECIMAL(10,3),
    "costPrice" DECIMAL(10,2),
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "reason" TEXT,
    "reference" TEXT,
    "employeeId" TEXT,
    "costPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalNote" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "status" "FiscalNoteStatus" NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'NFCE',
    "number" TEXT,
    "series" TEXT,
    "accessKey" TEXT,
    "xml" TEXT,
    "danfeUrl" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "customerCpf" TEXT,
    "errorMessage" TEXT,
    "issuedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSchedule" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloatingAccount" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "pickupCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloatingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalRevenue" DECIMAL(10,2),
    "totalOrders" INTEGER,
    "totalCancellations" INTEGER,
    "averageTicket" DECIMAL(10,2),
    "paymentBreakdown" JSONB,
    "notes" TEXT,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeStats" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageTicket" DECIMAL(10,2),
    "totalTips" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyRevenue" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hour" INTEGER NOT NULL,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourlyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readBy" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "employeeId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_organizationId_slug_key" ON "Unit"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Employee_unitId_isActive_idx" ON "Employee"("unitId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_unitId_pin_key" ON "Employee"("unitId", "pin");

-- CreateIndex
CREATE INDEX "Customer_unitId_phoneHash_idx" ON "Customer"("unitId", "phoneHash");

-- CreateIndex
CREATE INDEX "CustomerConsent_customerId_type_idx" ON "CustomerConsent"("customerId", "type");

-- CreateIndex
CREATE INDEX "WhatsAppSession_customerId_state_idx" ON "WhatsAppSession"("customerId", "state");

-- CreateIndex
CREATE INDEX "Zone_unitId_idx" ON "Zone"("unitId");

-- CreateIndex
CREATE INDEX "Layout_unitId_idx" ON "Layout"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_unitId_number_key" ON "Table"("unitId", "number");

-- CreateIndex
CREATE INDEX "Category_unitId_isActive_idx" ON "Category"("unitId", "isActive");

-- CreateIndex
CREATE INDEX "Product_unitId_categoryId_isAvailable_idx" ON "Product"("unitId", "categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "ModifierGroup_productId_idx" ON "ModifierGroup"("productId");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_idx" ON "Modifier"("modifierGroupId");

-- CreateIndex
CREATE INDEX "Check_unitId_status_idx" ON "Check"("unitId", "status");

-- CreateIndex
CREATE INDEX "Check_tableId_status_idx" ON "Check"("tableId", "status");

-- CreateIndex
CREATE INDEX "Order_checkId_status_idx" ON "Order"("checkId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "Payment_checkId_status_idx" ON "Payment"("checkId", "status");

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Cancellation_checkId_idx" ON "Cancellation"("checkId");

-- CreateIndex
CREATE INDEX "CashRegister_unitId_status_idx" ON "CashRegister"("unitId", "status");

-- CreateIndex
CREATE INDEX "CashRegisterOperation_cashRegisterId_idx" ON "CashRegisterOperation"("cashRegisterId");

-- CreateIndex
CREATE INDEX "StockItem_unitId_isActive_idx" ON "StockItem"("unitId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_unitId_sku_key" ON "StockItem"("unitId", "sku");

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_createdAt_idx" ON "StockMovement"("stockItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_stockItemId_key" ON "ProductIngredient"("productId", "stockItemId");

-- CreateIndex
CREATE INDEX "FiscalNote_unitId_status_idx" ON "FiscalNote"("unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalNote_unitId_externalRef_key" ON "FiscalNote"("unitId", "externalRef");

-- CreateIndex
CREATE INDEX "PriceSchedule_unitId_productId_dayOfWeek_idx" ON "PriceSchedule"("unitId", "productId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "FloatingAccount_checkId_key" ON "FloatingAccount"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "FloatingAccount_pickupCode_key" ON "FloatingAccount"("pickupCode");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_unitId_date_key" ON "DailyReport"("unitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeStats_employeeId_unitId_date_key" ON "EmployeeStats"("employeeId", "unitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyRevenue_unitId_date_hour_key" ON "HourlyRevenue"("unitId", "date", "hour");

-- CreateIndex
CREATE INDEX "Alert_unitId_isRead_idx" ON "Alert"("unitId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_unitId_entity_createdAt_idx" ON "AuditLog"("unitId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_unitId_employeeId_isRead_idx" ON "Notification"("unitId", "employeeId", "isRead");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_splitParentId_fkey" FOREIGN KEY ("splitParentId") REFERENCES "Check"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Check"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cancellation" ADD CONSTRAINT "Cancellation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterOperation" ADD CONSTRAINT "CashRegisterOperation_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashRegisterOperation" ADD CONSTRAINT "CashRegisterOperation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalNote" ADD CONSTRAINT "FiscalNote_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalNote" ADD CONSTRAINT "FiscalNote_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSchedule" ADD CONSTRAINT "PriceSchedule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSchedule" ADD CONSTRAINT "PriceSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloatingAccount" ADD CONSTRAINT "FloatingAccount_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStats" ADD CONSTRAINT "EmployeeStats_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

