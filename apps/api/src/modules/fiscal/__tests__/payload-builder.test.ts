import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import {
  buildNFCePayload,
  validateFiscalFields,
  REQUIRED_FISCAL_FIELDS,
  type CheckForFiscal,
} from '../payload-builder';
import { mapCategoryToNCM, mapPaymentMethodToFiscal, estimateTaxes } from '../ncm-mapper';

// ── Helpers ─────────────────────────────────────────────────────────

function makeCheck(overrides: Partial<CheckForFiscal> = {}): CheckForFiscal {
  return {
    id: 'cltest_check_001',
    discountAmount: null,
    orders: [
      {
        status: 'DELIVERED',
        isCortesia: false,
        items: [
          {
            productId: 'cltest_prod_001',
            quantity: 2,
            unitPrice: new Decimal('15.00'),
            totalPrice: new Decimal('30.00'),
            product: {
              id: 'cltest_prod_001',
              name: 'Cerveja Artesanal',
              category: { name: 'Cerveja' },
            },
          },
        ],
      },
    ],
    payments: [
      { method: 'PIX', amount: new Decimal('30.00'), status: 'CONFIRMED' },
    ],
    unit: {
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
    customer: null,
    ...overrides,
  };
}

// ── mapCategoryToNCM ────────────────────────────────────────────────

describe('mapCategoryToNCM', () => {
  it('maps cerveja to beer NCM', () => {
    expect(mapCategoryToNCM('Cerveja')).toBe('22030000');
    expect(mapCategoryToNCM('Cervejas Artesanais')).toBe('22030000');
    expect(mapCategoryToNCM('chopp')).toBe('22030000');
  });

  it('maps destilados to spirits NCM', () => {
    expect(mapCategoryToNCM('Destilados')).toBe('22084000');
    expect(mapCategoryToNCM('Whisky Premium')).toBe('22084000');
    expect(mapCategoryToNCM('Gin')).toBe('22084000');
    expect(mapCategoryToNCM('Cachaça')).toBe('22084000');
  });

  it('maps wine to wine NCM', () => {
    expect(mapCategoryToNCM('Vinhos')).toBe('22042100');
    expect(mapCategoryToNCM('Espumante')).toBe('22042100');
  });

  it('maps water to mineral water NCM', () => {
    expect(mapCategoryToNCM('Água')).toBe('22011000');
    expect(mapCategoryToNCM('agua mineral')).toBe('22011000');
  });

  it('maps soft drinks to refrigerante NCM', () => {
    expect(mapCategoryToNCM('Refrigerante')).toBe('22021000');
    expect(mapCategoryToNCM('Guaraná')).toBe('22021000');
  });

  it('maps juice to suco NCM', () => {
    expect(mapCategoryToNCM('Sucos')).toBe('20098990');
  });

  it('maps coffee to cafe NCM', () => {
    expect(mapCategoryToNCM('Café')).toBe('09012100');
  });

  it('uses default for unknown categories', () => {
    expect(mapCategoryToNCM('Carnes')).toBe('21069090');
    expect(mapCategoryToNCM('Entradas')).toBe('21069090');
    expect(mapCategoryToNCM(null)).toBe('21069090');
  });
});

// ── mapPaymentMethodToFiscal ────────────────────────────────────────

describe('mapPaymentMethodToFiscal', () => {
  it('maps all payment methods', () => {
    expect(mapPaymentMethodToFiscal('CASH')).toBe('01');
    expect(mapPaymentMethodToFiscal('CREDIT_CARD')).toBe('03');
    expect(mapPaymentMethodToFiscal('DEBIT_CARD')).toBe('04');
    expect(mapPaymentMethodToFiscal('PIX')).toBe('17');
    expect(mapPaymentMethodToFiscal('VOUCHER')).toBe('05');
  });

  it('uses default for unknown methods', () => {
    expect(mapPaymentMethodToFiscal('UNKNOWN')).toBe('99');
    expect(mapPaymentMethodToFiscal('CRYPTO')).toBe('99');
  });
});

// ── estimateTaxes ──────────────────────────────────────────────────

describe('estimateTaxes', () => {
  it('calculates 15% tax estimate', () => {
    expect(estimateTaxes(100)).toBe(15);
    expect(estimateTaxes(30)).toBe(4.5);
    expect(estimateTaxes(0)).toBe(0);
  });
});

// ── validateFiscalFields ────────────────────────────────────────────

describe('validateFiscalFields', () => {
  it('returns empty for complete fiscal config', () => {
    const unit = makeCheck().unit;
    expect(validateFiscalFields(unit)).toEqual([]);
  });

  it('returns missing cnpj', () => {
    const unit = { ...makeCheck().unit, cnpj: null };
    const missing = validateFiscalFields(unit);
    expect(missing).toContain('cnpj');
  });

  it('returns multiple missing fields', () => {
    const unit = {
      ...makeCheck().unit,
      cnpj: null,
      legalName: null,
      ibgeCode: '',
    };
    const missing = validateFiscalFields(unit);
    expect(missing).toContain('cnpj');
    expect(missing).toContain('legalName');
    expect(missing).toContain('ibgeCode');
    expect(missing).toHaveLength(3);
  });

  it('returns all fields for empty unit', () => {
    const unit = {
      name: 'Test',
      cnpj: null,
      stateRegistration: null,
      legalName: null,
      streetAddress: null,
      addressNumber: null,
      neighborhood: null,
      city: null,
      state: null,
      zipCode: null,
      ibgeCode: null,
    };
    const missing = validateFiscalFields(unit);
    expect(missing).toHaveLength(REQUIRED_FISCAL_FIELDS.length);
  });
});

// ── buildNFCePayload ────────────────────────────────────────────────

describe('buildNFCePayload', () => {
  it('builds payload for single product', () => {
    const check = makeCheck();
    const payload = buildNFCePayload(check);

    expect(payload.natureza_operacao).toBe('VENDA AO CONSUMIDOR');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]!.descricao).toBe('Cerveja Artesanal');
    expect(payload.items[0]!.ncm).toBe('22030000');
    expect(payload.items[0]!.quantidade_comercial).toBe(2);
    expect(payload.items[0]!.valor_unitario_comercial).toBe(15.0);
    expect(payload.items[0]!.valor_bruto).toBe(30.0);
    expect(payload.formas_pagamento).toHaveLength(1);
    expect(payload.formas_pagamento[0]!.forma_pagamento).toBe('17'); // PIX
    expect(payload.valor_total).toBe(30.0);
  });

  it('groups same product across multiple orders', () => {
    const check = makeCheck({
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 2,
              unitPrice: new Decimal('15.00'),
              totalPrice: new Decimal('30.00'),
              product: {
                id: 'cltest_prod_001',
                name: 'Cerveja',
                category: { name: 'Cerveja' },
              },
            },
          ],
        },
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 3,
              unitPrice: new Decimal('15.00'),
              totalPrice: new Decimal('45.00'),
              product: {
                id: 'cltest_prod_001',
                name: 'Cerveja',
                category: { name: 'Cerveja' },
              },
            },
          ],
        },
      ],
    });

    const payload = buildNFCePayload(check);

    // Should be grouped into single item with quantity=5
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]!.quantidade_comercial).toBe(5);
    expect(payload.items[0]!.valor_bruto).toBe(75.0);
  });

  it('handles multiple different products', () => {
    const check = makeCheck({
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 1,
              unitPrice: new Decimal('15.00'),
              totalPrice: new Decimal('15.00'),
              product: {
                id: 'cltest_prod_001',
                name: 'Cerveja',
                category: { name: 'Cerveja' },
              },
            },
            {
              productId: 'cltest_prod_002',
              quantity: 1,
              unitPrice: new Decimal('35.00'),
              totalPrice: new Decimal('35.00'),
              product: {
                id: 'cltest_prod_002',
                name: 'Picanha',
                category: { name: 'Carnes' },
              },
            },
          ],
        },
      ],
    });

    const payload = buildNFCePayload(check);
    expect(payload.items).toHaveLength(2);
    expect(payload.valor_produtos).toBe(50.0);
    expect(payload.valor_total).toBe(50.0);
  });

  it('handles multiple payment methods', () => {
    const check = makeCheck({
      payments: [
        { method: 'CASH', amount: new Decimal('20.00'), status: 'CONFIRMED' },
        { method: 'PIX', amount: new Decimal('10.00'), status: 'CONFIRMED' },
      ],
    });

    const payload = buildNFCePayload(check);
    expect(payload.formas_pagamento).toHaveLength(2);
    expect(payload.formas_pagamento[0]!.forma_pagamento).toBe('01'); // CASH
    expect(payload.formas_pagamento[1]!.forma_pagamento).toBe('17'); // PIX
  });

  it('applies discount', () => {
    const check = makeCheck({
      discountAmount: new Decimal('5.00'),
    });

    const payload = buildNFCePayload(check);
    expect(payload.valor_desconto).toBe(5.0);
    expect(payload.valor_total).toBe(25.0); // 30 - 5
  });

  it('includes customer CPF from parameter', () => {
    const check = makeCheck();
    const payload = buildNFCePayload(check, '12345678901');
    expect(payload.informacoes_adicionais_contribuinte).toContain('12345678901');
  });

  it('does not include CPF when not provided', () => {
    const check = makeCheck();
    const payload = buildNFCePayload(check);
    expect(payload.informacoes_adicionais_contribuinte).toBeUndefined();
  });

  it('excludes cancelled orders', () => {
    const check = makeCheck({
      orders: [
        {
          status: 'CANCELLED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 5,
              unitPrice: new Decimal('50.00'),
              totalPrice: new Decimal('250.00'),
              product: {
                id: 'cltest_prod_001',
                name: 'Should Not Appear',
                category: { name: 'Test' },
              },
            },
          ],
        },
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_002',
              quantity: 1,
              unitPrice: new Decimal('10.00'),
              totalPrice: new Decimal('10.00'),
              product: {
                id: 'cltest_prod_002',
                name: 'Included',
                category: { name: 'Cerveja' },
              },
            },
          ],
        },
      ],
    });

    const payload = buildNFCePayload(check);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]!.descricao).toBe('Included');
    expect(payload.valor_total).toBe(10.0);
  });

  it('excludes cortesia orders', () => {
    const check = makeCheck({
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: true,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 1,
              unitPrice: new Decimal('50.00'),
              totalPrice: new Decimal('50.00'),
              product: {
                id: 'cltest_prod_001',
                name: 'Cortesia',
                category: { name: 'Test' },
              },
            },
          ],
        },
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_002',
              quantity: 1,
              unitPrice: new Decimal('20.00'),
              totalPrice: new Decimal('20.00'),
              product: {
                id: 'cltest_prod_002',
                name: 'Paid',
                category: { name: 'Cerveja' },
              },
            },
          ],
        },
      ],
    });

    const payload = buildNFCePayload(check);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]!.descricao).toBe('Paid');
  });

  it('truncates long product names to 120 chars', () => {
    const longName = 'A'.repeat(200);
    const check = makeCheck({
      orders: [
        {
          status: 'DELIVERED',
          isCortesia: false,
          items: [
            {
              productId: 'cltest_prod_001',
              quantity: 1,
              unitPrice: new Decimal('10.00'),
              totalPrice: new Decimal('10.00'),
              product: {
                id: 'cltest_prod_001',
                name: longName,
                category: { name: 'Test' },
              },
            },
          ],
        },
      ],
    });

    const payload = buildNFCePayload(check);
    expect(payload.items[0]!.descricao).toHaveLength(120);
  });
});
