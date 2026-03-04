import crypto from 'node:crypto';
import { getConfig } from '../../lib/config';
import { AppError } from '../../lib/errors';
import type {
  PagarmeCreateOrderRequest,
  PagarmeOrderResponse,
} from './pagarme.types';

export class PagarmeService {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.PAGARME_BASE_URL;

    const apiKey = config.PAGARME_API_KEY;
    if (!apiKey) {
      throw new Error('PAGARME_API_KEY is not configured');
    }
    this.authHeader =
      'Basic ' + Buffer.from(apiKey + ':').toString('base64');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        if (response.status === 401) {
          throw AppError.serviceUnavailable(
            'Falha de autenticação com Pagar.me. Verifique a API key.',
          );
        }
        if (response.status === 422) {
          throw AppError.badRequest(
            `Dados inválidos enviados ao Pagar.me: ${JSON.stringify(errorBody)}`,
          );
        }
        if (response.status >= 500) {
          throw AppError.serviceUnavailable(
            'Pagar.me fora do ar. Tente novamente em instantes.',
          );
        }
        throw AppError.badGateway(
          `Pagar.me retornou erro ${response.status}: ${JSON.stringify(errorBody)}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.serviceUnavailable(
        'Serviço de pagamento indisponível. Tente novamente.',
      );
    }
  }

  async createPixOrder(params: {
    amountCents: number;
    description: string;
    referenceCode: string;
    customerName?: string;
    customerCpf?: string;
    expiresInSeconds?: number;
  }): Promise<PagarmeOrderResponse> {
    const body: PagarmeCreateOrderRequest = {
      items: [
        {
          amount: params.amountCents,
          description: params.description,
          quantity: 1,
          code: params.referenceCode,
        },
      ],
      payments: [
        {
          payment_method: 'pix',
          pix: {
            expires_in: params.expiresInSeconds ?? 1800, // 30 min default
          },
        },
      ],
    };

    if (params.customerName || params.customerCpf) {
      body.customer = {
        type: 'individual',
        ...(params.customerName && { name: params.customerName }),
        ...(params.customerCpf && {
          document: params.customerCpf,
          document_type: 'cpf' as const,
        }),
      };
    }

    const idempotencyKey = `pix_${params.referenceCode}_${Date.now()}`;
    return this.request<PagarmeOrderResponse>('POST', '/orders', body, idempotencyKey);
  }

  async createCardCheckout(params: {
    amountCents: number;
    description: string;
    referenceCode: string;
    successUrl: string;
    customerName?: string;
    customerEmail?: string;
  }): Promise<PagarmeOrderResponse> {
    const body: PagarmeCreateOrderRequest = {
      items: [
        {
          amount: params.amountCents,
          description: params.description,
          quantity: 1,
          code: params.referenceCode,
        },
      ],
      payments: [
        {
          payment_method: 'checkout',
          checkout: {
            accepted_payment_methods: ['credit_card', 'debit_card'],
            success_url: params.successUrl,
            skip_checkout_success_page: false,
            customer_editable: false,
          },
        },
      ],
    };

    if (params.customerName || params.customerEmail) {
      body.customer = {
        type: 'individual',
        ...(params.customerName && { name: params.customerName }),
        ...(params.customerEmail && { email: params.customerEmail }),
      };
    }

    const idempotencyKey = `card_${params.referenceCode}_${Date.now()}`;
    return this.request<PagarmeOrderResponse>('POST', '/orders', body, idempotencyKey);
  }

  async getOrder(orderId: string): Promise<PagarmeOrderResponse> {
    return this.request<PagarmeOrderResponse>('GET', `/orders/${orderId}`);
  }

  validateWebhookSignature(body: string, signature: string): boolean {
    const config = getConfig();
    const secret = config.PAGARME_WEBHOOK_SECRET;
    if (!secret) return false;

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(signature),
      );
    } catch {
      return false;
    }
  }
}

let _instance: PagarmeService | null = null;

export function getPagarmeService(): PagarmeService {
  if (!_instance) {
    _instance = new PagarmeService();
  }
  return _instance;
}
