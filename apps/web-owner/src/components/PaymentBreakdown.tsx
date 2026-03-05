const METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  VOUCHER: 'Voucher',
};

const METHOD_COLORS: Record<string, string> = {
  PIX: 'bg-green-500',
  CASH: 'bg-yellow-500',
  CREDIT_CARD: 'bg-blue-500',
  DEBIT_CARD: 'bg-purple-500',
  VOUCHER: 'bg-orange-500',
};

interface PaymentBreakdownProps {
  byMethod: Record<string, number>;
  totalConfirmed: number;
}

export function PaymentBreakdown({ byMethod, totalConfirmed }: PaymentBreakdownProps) {
  const entries = Object.entries(byMethod)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return <p className="text-gray-400 text-sm">Nenhum pagamento registrado</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([method, amount]) => {
        const pct = totalConfirmed > 0 ? (amount / totalConfirmed) * 100 : 0;
        return (
          <div key={method}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">
                {METHOD_LABELS[method] ?? method}
              </span>
              <span className="text-gray-600">
                R$ {amount.toFixed(2)} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${METHOD_COLORS[method] ?? 'bg-gray-400'}`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
