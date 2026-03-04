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
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
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

    return this.request<PagarmeOrderResponse>('POST', '/orders', body);
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

    return this.request<PagarmeOrderResponse>('POST', '/orders', body);
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
