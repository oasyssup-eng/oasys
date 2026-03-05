import type { OrderStatus } from '../enums';

/** Lightweight order representation for lists */
export interface OrderDTO {
  id: string;
  checkId: string;
  employeeId: string | null;
  status: OrderStatus;
  orderNumber: number | null;
  courseType: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Full order details with items and delivery info */
export interface OrderDetailsDTO extends OrderDTO {
  holdUntil: string | null;
  deliveredAt: string | null;
  deliveredBy: string | null;
  notifiedAt: string | null;
  items: OrderItemDTO[];
}

/** Item within an order */
interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  modifiers: unknown;
}

/** Input for creating a new order */
export interface CreateOrderInput {
  checkId: string;
  courseType?: string;
  source?: string;
  items: CreateOrderItemInput[];
}

/** Input for creating an order item */
interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  modifiers?: Record<string, unknown>[];
}
