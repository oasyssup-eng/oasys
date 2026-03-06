import type { OrderStatus, OrderPolicy } from '../enums';

// ── Session ──────────────────────────────────────────────────────────

export interface MenuSessionDTO {
  sessionToken: string;
  unit: MenuUnitDTO;
  context: MenuSessionContext;
  isOpen: boolean;
  expiresAt: string;
}

export interface MenuUnitDTO {
  id: string;
  name: string;
  slug: string;
  orderPolicy: OrderPolicy;
  serviceFeeRate: number | null;
  tipSuggestions: number[] | null;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
}

export interface MenuSessionContext {
  type: 'TABLE' | 'COUNTER';
  tableId: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  checkId: string;
  customerName: string | null;
}

// ── Products ─────────────────────────────────────────────────────────

export interface MenuProductDTO {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  effectivePrice: number;
  priceLabel: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  preparationTime: number | null;
  station: string | null;
  tags: string[];
  sortOrder: number;
  hasModifiers: boolean;
}

export interface MenuCategoryWithProductsDTO {
  id: string;
  name: string;
  sortOrder: number;
  products: MenuProductDTO[];
}

export interface MenuProductDetailDTO {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  effectivePrice: number;
  priceLabel: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  preparationTime: number | null;
  station: string | null;
  tags: string[];
  modifierGroups: MenuModifierGroupDTO[];
}

export interface MenuModifierGroupDTO {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  sortOrder: number;
  modifiers: MenuModifierDTO[];
}

export interface MenuModifierDTO {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
}

// ── Orders ───────────────────────────────────────────────────────────

export interface MenuOrderResponseDTO {
  orderId: string;
  orderNumber: number | null;
  status: OrderStatus;
  checkId: string;
  items: MenuOrderItemDTO[];
  total: number;
  paymentRequired: boolean;
  paymentOptions: { pix: boolean; card: boolean } | null;
  message: string;
}

export interface MenuOrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  modifiers: { modifierId: string; name: string; price: number; quantity: number }[];
}

export interface MenuOrderDetailDTO {
  id: string;
  status: OrderStatus;
  orderNumber: number | null;
  items: MenuOrderItemDTO[];
  total: number;
  createdAt: string;
}

// ── Search ───────────────────────────────────────────────────────────

export interface MenuSearchResultDTO {
  id: string;
  name: string;
  categoryName: string;
  price: number;
  imageUrl: string | null;
}

// ── Check Summary (customer view) ───────────────────────────────────

export interface MenuCheckSummaryDTO {
  id: string;
  status: string;
  tableId: string | null;
  tableNumber: number | null;
  totalAmount: number;
  serviceFeeAmount: number;
  tipAmount: number | null;
  discountAmount: number | null;
  orders: MenuCheckOrderDTO[];
  payments: MenuCheckPaymentDTO[];
  itemsTotal: number;
  grossTotal: number;
  totalPaid: number;
  remainingBalance: number;
}

export interface MenuCheckOrderDTO {
  id: string;
  status: string;
  orderNumber: number | null;
  items: MenuOrderItemDTO[];
}

export interface MenuCheckPaymentDTO {
  id: string;
  method: string;
  amount: number;
  status: string;
}
