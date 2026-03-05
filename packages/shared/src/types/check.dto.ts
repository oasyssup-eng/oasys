import type { CheckStatus } from '../enums';

/** Lightweight check representation for lists */
export interface CheckDTO {
  id: string;
  unitId: string;
  tableId: string | null;
  employeeId: string;
  status: CheckStatus;
  totalAmount: number | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full check details with financial breakdown, orders, and payments */
export interface CheckDetailsDTO extends CheckDTO {
  // Table info
  tableNumber: number | null;
  zoneName: string | null;

  // Financial
  serviceFeeAmount: number | null;
  tipAmount: number | null;
  discountAmount: number | null;
  discountReason: string | null;

  // Split/merge
  splitParentId: string | null;
  mergedIntoId: string | null;

  // Nested data
  orders: CheckOrderDTO[];
  payments: CheckPaymentDTO[];
  splitChildren: CheckDTO[];

  // Calculated
  itemsTotal: number;
  grossTotal: number;
  totalPaid: number;
  remainingBalance: number;
}

/** Order within a check detail view */
interface CheckOrderDTO {
  id: string;
  orderNumber: number | null;
  status: string;
  source: string | null;
  createdAt: string;
  items: CheckOrderItemDTO[];
}

/** Order item within a check detail view */
interface CheckOrderItemDTO {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  modifiers: unknown;
}

/** Payment within a check detail view */
interface CheckPaymentDTO {
  id: string;
  method: string;
  amount: number;
  status: string;
  paidAt: string | null;
}
