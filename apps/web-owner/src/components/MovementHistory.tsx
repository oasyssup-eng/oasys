interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  employeeName?: string | null;
  costPrice?: number | null;
  createdAt: string;
}

interface MovementHistoryProps {
  movements: Movement[];
}

const TYPE_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saida',
  ADJUSTMENT: 'Ajuste',
  LOSS: 'Perda',
  TRANSFER: 'Transfer.',
};

const TYPE_COLORS: Record<string, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-blue-100 text-blue-800',
  ADJUSTMENT: 'bg-purple-100 text-purple-800',
  LOSS: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-yellow-100 text-yellow-800',
};

export function MovementHistory({ movements }: MovementHistoryProps) {
  if (movements.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Nenhuma movimentacao registrada
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Data</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Tipo</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Qtd</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Motivo</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Operador</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-500">
                {new Date(m.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[m.type] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {TYPE_LABELS[m.type] ?? m.type}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {m.type === 'IN' ? '+' : m.type === 'ADJUSTMENT' ? '=' : '-'}
                {m.quantity.toFixed(m.quantity % 1 === 0 ? 0 : 1)}
              </td>
              <td className="px-3 py-2 text-gray-600">{m.reason ?? '—'}</td>
              <td className="px-3 py-2 text-gray-500">{m.employeeName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
