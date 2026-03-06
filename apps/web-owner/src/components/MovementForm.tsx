import { useState } from 'react';

interface MovementFormProps {
  stockItemId: string;
  stockItemName: string;
  currentQuantity: number;
  unitType: string;
  onSubmit: (data: {
    stockItemId: string;
    type: 'IN' | 'ADJUSTMENT' | 'LOSS';
    quantity: number;
    reason?: string;
    costPrice?: number;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TYPE_LABELS = {
  IN: 'Entrada',
  ADJUSTMENT: 'Ajuste (Inventario)',
  LOSS: 'Perda / Quebra',
} as const;

export function MovementForm({
  stockItemId,
  stockItemName,
  currentQuantity,
  unitType,
  onSubmit,
  onCancel,
  isLoading,
}: MovementFormProps) {
  const [type, setType] = useState<'IN' | 'ADJUSTMENT' | 'LOSS'>('IN');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [costPrice, setCostPrice] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      stockItemId,
      type,
      quantity,
      reason: reason.trim() || undefined,
      costPrice: costPrice > 0 ? costPrice : undefined,
    });
  };

  const previewQuantity =
    type === 'ADJUSTMENT'
      ? quantity
      : type === 'IN'
        ? currentQuantity + quantity
        : currentQuantity - quantity;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="font-medium text-gray-900">{stockItemName}</p>
        <p className="text-gray-500">
          Estoque atual: {currentQuantity.toFixed(1)} {unitType}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Movimentacao
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'IN' | 'ADJUSTMENT' | 'LOSS')}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {(Object.entries(TYPE_LABELS) as [keyof typeof TYPE_LABELS, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {type === 'ADJUSTMENT' ? 'Nova Quantidade' : 'Quantidade'}
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          min={0}
          step="0.001"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Resultado: {previewQuantity.toFixed(1)} {unitType}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Motivo / Observacao
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Reposicao semanal, Quebra de garrafa..."
        />
      </div>

      {type === 'IN' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preco de Custo Unitario (R$)
          </label>
          <input
            type="number"
            value={costPrice}
            onChange={(e) => setCostPrice(Number(e.target.value))}
            min={0}
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={quantity <= 0 || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Registrando...' : 'Registrar Movimentacao'}
        </button>
      </div>
    </form>
  );
}
