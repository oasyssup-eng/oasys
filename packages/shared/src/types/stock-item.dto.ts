import type { MovementType } from '../enums';

/** Stock item representation */
export interface StockItemDTO {
  id: string;
  unitId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitType: string;
  minQuantity: number | null;
  costPrice: number | null;
  supplierId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Stock movement record */
export interface StockMovementDTO {
  id: string;
  stockItemId: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  reference: string | null;
  employeeId: string | null;
  costPrice: number | null;
  createdAt: string;
}

/** Input for creating a stock movement */
export interface CreateStockMovementInput {
  stockItemId: string;
  type: MovementType;
  quantity: number;
  reason?: string;
  reference?: string;
  costPrice?: number;
}
