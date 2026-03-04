import type { PagarmeOrderResponse } from '../pagarme.types';

export function mockPixOrderResponse(
  overrides?: Partial<PagarmeOrderResponse>,
): PagarmeOrderResponse {
  return {
    id: 'or_test_pix_123',
    status: 'pending',
    charges: [
      {
        id: 'ch_test_123',
        last_transaction: {
          qr_code: '00020126580014br.gov.bcb.pix0136test-pix-qr-code',
          qr_code_url: 'https://api.pagar.me/test/qrcode.png',
        },
      },
    ],
    ...overrides,
  };
}

export function mockCardCheckoutResponse(
  overrides?: Partial<PagarmeOrderResponse>,
): PagarmeOrderResponse {
  return {
    id: 'or_test_card_456',
    status: 'pending',
    checkouts: [
      {
        payment_url: 'https://pagar.me/pay/test-checkout-123',
      },
    ],
    ...overrides,
  };
}

export function mockWebhookPayload(
  type: string,
  externalId: string,
  status = 'paid',
) {
  return {
    id: `hook_${Date.now()}`,
    type,
    data: {
      id: externalId,
      status,
    },
  };
}
