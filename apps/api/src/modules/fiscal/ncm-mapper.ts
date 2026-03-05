// ── NCM & Payment Method Mapping ──────────────────────────────────
// Pure functions mapping product categories to fiscal NCM codes
// and payment methods to SEFAZ fiscal codes.

/**
 * Maps a product category name to its NCM (Nomenclatura Comum do Mercosul) code.
 * Defaults to 2106.90.90 (prepared food products) for unknown categories.
 */
export function mapCategoryToNCM(categoryName: string | null): string {
  if (!categoryName) return '21069090';

  const lower = categoryName.toLowerCase();

  // Beverages — alcoholic
  if (lower.includes('cerveja') || lower.includes('chopp') || lower.includes('beer')) {
    return '22030000'; // Beer from malt
  }
  if (lower.includes('destilado') || lower.includes('whisky') || lower.includes('vodka') || lower.includes('rum') || lower.includes('gin') || lower.includes('cachaça') || lower.includes('cachaca')) {
    return '22084000'; // Spirits
  }
  if (lower.includes('vinho') || lower.includes('wine') || lower.includes('espumante')) {
    return '22042100'; // Wine
  }

  // Beverages — non-alcoholic
  if (lower.includes('agua') || lower.includes('água') || lower.includes('water')) {
    return '22011000'; // Mineral water
  }
  if (lower.includes('refrigerante') || lower.includes('soda') || lower.includes('coca') || lower.includes('guaraná') || lower.includes('guarana')) {
    return '22021000'; // Soft drinks
  }
  if (lower.includes('suco') || lower.includes('juice')) {
    return '20098990'; // Fruit juices
  }
  if (lower.includes('café') || lower.includes('cafe') || lower.includes('coffee')) {
    return '09012100'; // Coffee
  }

  // Food
  if (lower.includes('sorvete') || lower.includes('ice cream') || lower.includes('gelato')) {
    return '21050010'; // Ice cream
  }

  // Default: prepared food products
  return '21069090';
}

/**
 * Maps internal PaymentMethod enum to SEFAZ fiscal payment code.
 * Reference: NT 2015/002 — Table of payment methods.
 */
export function mapPaymentMethodToFiscal(method: string): string {
  const map: Record<string, string> = {
    CASH: '01',        // Dinheiro
    CREDIT_CARD: '03', // Cartão de crédito
    DEBIT_CARD: '04',  // Cartão de débito
    PIX: '17',         // Pagamento instantâneo (PIX)
    VOUCHER: '05',     // Vale alimentação
  };
  return map[method] ?? '99'; // Outros
}

/**
 * Estimates approximate tax burden for consumer transparency (Lei 12.741).
 * Uses simplified Simples Nacional rate (~15% average).
 */
export function estimateTaxes(value: number): number {
  const SIMPLES_RATE = 0.15; // ~15% approximate total tax burden
  return Math.round(value * SIMPLES_RATE * 100) / 100;
}
