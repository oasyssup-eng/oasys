import type { PaymentMethod, PaymentStatus } from '../enums';

/** Payment record representation */
export interface PaymentDTO {
  id: string;
  checkId: string;
  employeeId: string | null;
  method: PaymentMethod;
  amount: number;
  receivedAmount: number | null;
  change: number | null;
  status: PaymentStatus;
  externalId: string | null;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  paymentUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cashRegisterId: string | null;
  cardBrand: string | null;
  lastFourDigits: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a cash payment */
export interface CreateCashPaymentInput {
  checkId: string;
  amount: number;
  receivedAmount?: number;
}

/** Input for creating a PIX payment */
export interface CreatePixPaymentInput {
  checkId: string;
  amount: number;
  customerName?: string;
  customerCpf?: string;
}

/** Input for creating a card payment (online link) */
export interface CreateCardPaymentInput {
  checkId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
}

/** Input for registering a card-present payment */
export interface CreateCardPresentInput {
  checkId: string;
  amount: number;
  cardBrand?: string;
  lastFourDigits?: string;
  isDebit?: boolean;
}

/** Payment summary for a check */
export interface PaymentSummaryDTO {
  checkId: string;
  checkTotal: number;
  serviceFeeAmount: number;
  tipAmount: number;
  discountAmount: number;
  grossTotal: number;
  totalPaid: number;
  remainingBalance: number;
  isPaid: boolean;
  payments: PaymentDTO[];
  breakdown: Record<string, number>;
}
