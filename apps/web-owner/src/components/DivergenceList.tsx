interface Divergence {
  type: string;
  description: string;
  expected?: number;
  actual?: number;
  difference?: number;
}

interface DivergenceListProps {
  divergences: Divergence[];
}

const TYPE_LABELS: Record<string, string> = {
  CASH_DIFFERENCE: 'Diferença de Caixa',
  FISCAL_MISSING: 'Nota Fiscal Ausente',
  PENDING_PAYMENTS: 'Pagamentos Pendentes',
  REVENUE_PAYMENT_MISMATCH: 'Divergência Receita × Pagamentos',
};

const TYPE_COLORS: Record<string, string> = {
  CASH_DIFFERENCE: 'bg-orange-100 text-orange-800',
  FISCAL_MISSING: 'bg-red-100 text-red-800',
  PENDING_PAYMENTS: 'bg-yellow-100 text-yellow-800',
  REVENUE_PAYMENT_MISMATCH: 'bg-red-100 text-red-800',
};

export function DivergenceList({ divergences }: DivergenceListProps) {
  if (divergences.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
        <span className="text-green-500">✓</span>
        <p className="text-sm text-green-800">Sem divergências detectadas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Descrição</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Esperado</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Real</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Diferença</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {divergences.map((d, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[d.type] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {TYPE_LABELS[d.type] ?? d.type}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-700">{d.description}</td>
              <td className="px-4 py-2 text-right text-gray-600">
                {d.expected != null ? `R$ ${d.expected.toFixed(2)}` : '—'}
              </td>
              <td className="px-4 py-2 text-right text-gray-600">
                {d.actual != null ? `R$ ${d.actual.toFixed(2)}` : '—'}
              </td>
              <td className="px-4 py-2 text-right font-medium text-red-600">
                {d.difference != null ? `R$ ${d.difference.toFixed(2)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
