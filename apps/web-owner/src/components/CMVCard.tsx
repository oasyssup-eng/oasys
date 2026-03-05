interface CMVCardProps {
  totalCost: number;
  netRevenue: number;
  cmvPercentage: number;
  startDate: string;
  endDate: string;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function CMVCard({
  totalCost,
  netRevenue,
  cmvPercentage,
  startDate,
  endDate,
}: CMVCardProps) {
  let cmvColor: string;
  if (cmvPercentage <= 30) {
    cmvColor = 'text-green-700';
  } else if (cmvPercentage <= 40) {
    cmvColor = 'text-yellow-700';
  } else {
    cmvColor = 'text-red-700';
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          CMV (Custo de Mercadoria Vendida)
        </h3>
        <span className="text-xs text-gray-400">
          {new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} —{' '}
          {new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="flex items-end gap-1 mb-3">
        <span className={`text-3xl font-bold ${cmvColor}`}>
          {cmvPercentage.toFixed(1)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Custo Total</p>
          <p className="font-medium text-gray-900">{formatBRL(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Receita Liquida</p>
          <p className="font-medium text-gray-900">{formatBRL(netRevenue)}</p>
        </div>
      </div>

      {cmvPercentage > 40 && (
        <p className="text-xs text-red-600 mt-2">
          CMV acima de 40% — revise precos ou custos de insumos
        </p>
      )}
    </div>
  );
}
