export interface PagarmeOrderItem {
  amount: number; // centavos
  description: string;
  quantity: number;
  code: string;
}

export interface PagarmeCustomer {
  name?: string;
  type?: 'individual' | 'company';
  document?: string;
  document_type?: 'cpf' | 'cnpj';
  email?: string;
}

export interface PagarmePixPayment {
  payment_method: 'pix';
  pix: {
    expires_in: number; // seconds
  };
}

export interface PagarmeCheckoutPayment {
  payment_method: 'checkout';
  checkout: {
    accepted_payment_methods: string[];
    success_url: string;
    skip_checkout_success_page: boolean;
    customer_editable: boolean;
  };
}

export interface PagarmeCreateOrderRequest {
  items: PagarmeOrderItem[];
  payments: (PagarmePixPayment | PagarmeCheckoutPayment)[];
  customer?: PagarmeCustomer;
}

export interface PagarmeTransaction {
  qr_code?: string;
  qr_code_url?: string;
}

export interface PagarmeCharge {
  id: string;
  last_transaction: PagarmeTransaction;
}

export interface PagarmeCheckout {
  payment_url: string;
}

export interface PagarmeOrderResponse {
  id: string;
  status: string;
  charges?: PagarmeCharge[];
  checkouts?: PagarmeCheckout[];
}

export interface PagarmeWebhookPayload {
  id: string;
  type: string;
  data: {
    id: string;
    status: string;
    charges?: PagarmeCharge[];
  };
}
