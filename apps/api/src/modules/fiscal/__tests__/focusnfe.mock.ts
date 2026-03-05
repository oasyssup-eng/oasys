import { vi } from 'vitest';
import type { FocusNFeEmitResponse, FocusNFeCancelResponse } from '../focusnfe.types';

/**
 * Creates a mock FocusNFe service for testing.
 */
export function createMockFocusNFeService() {
  return {
    emitNFCe: vi.fn().mockResolvedValue({
      cnpj_emitente: '12345678000199',
      ref: 'test_ref',
      status: 'processando_autorizacao',
    } satisfies Partial<FocusNFeEmitResponse>),

    getStatus: vi.fn().mockResolvedValue({
      cnpj_emitente: '12345678000199',
      ref: 'test_ref',
      status: 'autorizado',
      chave_nfe: '12345678901234567890123456789012345678901234',
      numero: '000001',
      serie: '001',
      url_danfe: 'https://focusnfe.com.br/danfe/test',
    }),

    cancelNFCe: vi.fn().mockResolvedValue({
      status: 'cancelado',
    } satisfies Partial<FocusNFeCancelResponse>),

    downloadXML: vi.fn().mockResolvedValue(
      '<?xml version="1.0"?><nfeProc><NFe><infNFe></infNFe></NFe></nfeProc>',
    ),
  };
}

/**
 * Creates a mock Prisma client with all models needed for fiscal tests.
 */
export function createMockPrisma() {
  return {
    check: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    fiscalNote: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    alert: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

/**
 * Creates a sample check for fiscal testing.
 */
export function createSampleCheck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cltest_check_001',
    unitId: 'cltest_unit_001',
    status: 'PAID',
    discountAmount: null,
    orders: [
      {
        id: 'cltest_order_001',
        status: 'DELIVERED',
        isCortesia: false,
        items: [
          {
            productId: 'cltest_prod_001',
            quantity: 2,
            unitPrice: { toNumber: () => 15.0 },
            totalPrice: { toNumber: () => 30.0 },
            product: {
              id: 'cltest_prod_001',
              name: 'Cerveja Artesanal',
              category: { name: 'Cerveja' },
            },
          },
          {
            productId: 'cltest_prod_002',
            quantity: 1,
            unitPrice: { toNumber: () => 35.0 },
            totalPrice: { toNumber: () => 35.0 },
            product: {
              id: 'cltest_prod_002',
              name: 'Picanha na Brasa',
              category: { name: 'Carnes' },
            },
          },
        ],
      },
    ],
    payments: [
      { method: 'PIX', amount: { toNumber: () => 65.0 }, status: 'CONFIRMED' },
    ],
    unit: {
      id: 'cltest_unit_001',
      name: 'Bar do Zé',
      cnpj: '12345678000199',
      stateRegistration: '123456789',
      legalName: 'Bar do Zé LTDA',
      streetAddress: 'Rua dos Testes',
      addressNumber: '42',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
      ibgeCode: '3550308',
    },
    customer: { name: 'João Teste' },
    ...overrides,
  };
}
