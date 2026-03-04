import type { PaymentMethod, PaymentStatus } from '../enums';

/** Payment record representation */
export interface PaymentDTO {
  id: string;
  checkId: string;
  employeeId: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  externalId: string | null;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  paymentUrl: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  cashRegisterId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a cash payment */
export interface CreateCashPaymentInput {
  checkId: string;
  amount: number;
  cashRegisterId: string;
}

/** Input for creating a PIX payment */
export interface CreatePixPaymentInput {
  checkId: string;
  amount: number;
  customerCpf?: string;
}

/** Input for creating a card payment (online link) */
export interface CreateCardPaymentInput {
  checkId: string;
  amount: number;
  method: 'CREDIT_CARD' | 'DEBIT_CARD';
}
