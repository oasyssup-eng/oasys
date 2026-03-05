import { Decimal } from '@prisma/client/runtime/library';
import type { NFCePayload, NFCeItem, NFCePaymentForm } from './focusnfe.types';
import { mapCategoryToNCM, mapPaymentMethodToFiscal, estimateTaxes } from './ncm-mapper';

// ── Types for the Check data needed to build an NFC-e payload ──────

interface FiscalOrderItem {
  productId: string;
  quantity: number;
  unitPrice: Decimal;
  totalPrice: Decimal;
  product: {
    id: string;
    name: string;
    category: { name: string };
  };
}

interface FiscalOrder {
  status: string;
  isCortesia: boolean;
  items: FiscalOrderItem[];
}

interface FiscalPayment {
  method: string;
  amount: Decimal;
  status: string;
}

interface FiscalUnit {
  cnpj: string | null;
  stateRegistration: string | null;
  legalName: string | null;
  name: string;
  streetAddress: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ibgeCode: string | null;
}

export interface CheckForFiscal {
  id: string;
  discountAmount: Decimal | null;
  orders: FiscalOrder[];
  payments: FiscalPayment[];
  unit: FiscalUnit;
  customer: { name: string | null } | null;
}

// ── Required fiscal fields ──────────────────────────────────────────

export const REQUIRED_FISCAL_FIELDS = [
  'cnpj',
  'stateRegistration',
  'legalName',
  'streetAddress',
  'addressNumber',
  'neighborhood',
  'city',
  'state',
  'zipCode',
  'ibgeCode',
] as const;

/**
 * Returns array of missing field names needed for NFC-e emission.
 * Empty array means all fields present.
 */
export function validateFiscalFields(unit: FiscalUnit): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_FISCAL_FIELDS) {
    const value = unit[field];
    if (!value || value.trim().length === 0) {
      missing.push(field);
    }
  }
  return missing;
}

// ── Payload builder ────────────────────────────────────────────────

/**
 * Builds a complete NFC-e payload from check data.
 * Filters out CANCELLED and cortesia orders, groups items by product,
 * maps payment methods to fiscal codes.
 */
export function buildNFCePayload(
  check: CheckForFiscal,
  customerCpf?: string,
): NFCePayload {
  // 1. Filter: exclude CANCELLED orders and cortesia orders
  const validOrders = check.orders.filter(
    (o) => o.status !== 'CANCELLED' && !o.isCortesia,
  );

  // 2. Collect all items from valid orders
  const allItems = validOrders.flatMap((o) => o.items);

  // 3. Group by productId (same product across orders → sum quantities)
  const grouped = new Map<
    string,
    {
      productId: string;
      name: string;
      categoryName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  >();

  for (const item of allItems) {
    const key = item.productId;
    const existing = grouped.get(key);
    const qty = item.quantity;
    const price = Number(item.unitPrice);
    const total = Number(item.totalPrice);

    if (existing) {
      existing.quantity += qty;
      existing.total += total;
    } else {
      grouped.set(key, {
        productId: item.productId,
        name: item.product.name.slice(0, 120), // Max 120 chars for SEFAZ
        categoryName: item.product.category.name,
        quantity: qty,
        unitPrice: price,
        total,
      });
    }
  }

  // 4. Map to NFCeItem
  let itemNumber = 0;
  const items: NFCeItem[] = [];
  for (const group of grouped.values()) {
    itemNumber++;
    const ncm = mapCategoryToNCM(group.categoryName);
    const taxEstimate = estimateTaxes(group.total);

    items.push({
      numero_item: itemNumber,
      codigo_produto: group.productId.slice(-13), // Max 13 chars for SEFAZ
      descricao: group.name,
      ncm,
      cfop: '5102', // Sales within the state
      unidade_comercial: 'UN',
      quantidade_comercial: group.quantity,
      valor_unitario_comercial: round2(group.unitPrice),
      valor_bruto: round2(group.total),
      unidade_tributavel: 'UN',
      quantidade_tributavel: group.quantity,
      valor_unitario_tributavel: round2(group.unitPrice),
      icms_situacao_tributaria: '102', // Simples Nacional sem crédito
      icms_origem: '0', // Nacional
      valor_aproximado_tributos: taxEstimate,
    });
  }

  // 5. Map payments to fiscal codes
  const confirmedPayments = check.payments.filter((p) => p.status === 'CONFIRMED');
  const formasPagamento: NFCePaymentForm[] = confirmedPayments.map((p) => ({
    forma_pagamento: mapPaymentMethodToFiscal(p.method),
    valor_pagamento: round2(Number(p.amount)),
  }));

  // 6. Calculate totals
  const valorProdutos = items.reduce((sum, it) => sum + it.valor_bruto, 0);
  const valorDesconto = check.discountAmount ? Number(check.discountAmount) : 0;
  const valorTotal = Math.max(0, valorProdutos - valorDesconto);

  // 7. Assemble payload
  const payload: NFCePayload = {
    natureza_operacao: 'VENDA AO CONSUMIDOR',
    forma_pagamento: '0', // à vista
    tipo_documento: '1', // saída
    finalidade_emissao: '1', // normal
    consumidor_final: '1', // sim
    presenca_comprador: '1', // presencial
    items,
    formas_pagamento: formasPagamento,
    valor_produtos: round2(valorProdutos),
    valor_desconto: round2(valorDesconto),
    valor_total: round2(valorTotal),
  };

  // Add CPF note if provided
  const cpf = customerCpf;
  if (cpf) {
    payload.informacoes_adicionais_contribuinte = `CPF do consumidor: ${cpf}`;
  }

  return payload;
}

// ── Helpers ────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
