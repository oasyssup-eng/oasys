import { getConfig } from '../../lib/config';
import { AppError } from '../../lib/errors';
import type {
  NFCePayload,
  FocusNFeEmitResponse,
  FocusNFeStatusResponse,
  FocusNFeCancelResponse,
} from './focusnfe.types';

/**
 * FocusNFe HTTP client — mirrors PagarmeService singleton pattern.
 * Handles NFC-e emission, status queries, cancellation, and XML download.
 */
export class FocusNFeService {
  private baseUrl: string;
  private authHeader: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.FOCUSNFE_BASE_URL;

    const token = config.FOCUSNFE_TOKEN;
    if (!token) {
      throw new Error('FOCUSNFE_TOKEN is not configured');
    }
    // FocusNFe uses HTTP Basic Auth with token as username and empty password
    this.authHeader =
      'Basic ' + Buffer.from(token + ':').toString('base64');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    timeout = 15_000,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        if (response.status === 401) {
          throw AppError.serviceUnavailable(
            'Falha de autenticacao com FocusNFe. Verifique o token.',
          );
        }
        if (response.status === 422) {
          throw AppError.badRequest(
            `Dados invalidos enviados ao FocusNFe: ${JSON.stringify(errorBody)}`,
          );
        }
        if (response.status >= 500) {
          throw AppError.serviceUnavailable(
            'FocusNFe fora do ar. Tente novamente em instantes.',
          );
        }
        throw AppError.badGateway(
          `FocusNFe retornou erro ${response.status}: ${JSON.stringify(errorBody)}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.serviceUnavailable(
        'Servico fiscal indisponivel. Tente novamente.',
      );
    }
  }

  /** Emit an NFC-e — POST /v2/nfce?ref={ref} */
  async emitNFCe(ref: string, payload: NFCePayload): Promise<FocusNFeEmitResponse> {
    return this.request<FocusNFeEmitResponse>(
      'POST',
      `/v2/nfce?ref=${encodeURIComponent(ref)}`,
      payload,
    );
  }

  /** Get NFC-e status — GET /v2/nfce/{ref} */
  async getStatus(ref: string): Promise<FocusNFeStatusResponse> {
    return this.request<FocusNFeStatusResponse>(
      'GET',
      `/v2/nfce/${encodeURIComponent(ref)}`,
    );
  }

  /** Cancel an NFC-e — DELETE /v2/nfce/{ref} */
  async cancelNFCe(ref: string, justification: string): Promise<FocusNFeCancelResponse> {
    return this.request<FocusNFeCancelResponse>(
      'DELETE',
      `/v2/nfce/${encodeURIComponent(ref)}`,
      { justificativa: justification },
    );
  }

  /** Download NFC-e XML — GET /v2/nfce/{ref}.xml */
  async downloadXML(ref: string): Promise<string> {
    const url = `${this.baseUrl}/v2/nfce/${encodeURIComponent(ref)}.xml`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw AppError.badGateway(
          `Falha ao baixar XML da NFC-e: status ${response.status}`,
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw AppError.serviceUnavailable(
        'Falha ao baixar XML do servico fiscal.',
      );
    }
  }
}

// ── Singleton ──────────────────────────────────────────────────────
let _instance: FocusNFeService | null = null;

export function getFocusNFeService(): FocusNFeService {
  if (!_instance) {
    _instance = new FocusNFeService();
  }
  return _instance;
}
