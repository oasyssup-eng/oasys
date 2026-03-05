import { useState } from 'react';

const UNIT_TYPES = ['UN', 'KG', 'L', 'ML', 'G', 'DOSE'] as const;

interface StockItemFormData {
  name: string;
  sku?: string;
  unitType: string;
  quantity?: number;
  minQuantity?: number;
  costPrice?: number;
}

interface StockItemFormProps {
  initial?: Partial<StockItemFormData>;
  onSubmit: (data: StockItemFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function StockItemForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
  isEdit,
}: StockItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [unitType, setUnitType] = useState(initial?.unitType ?? 'UN');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [minQuantity, setMinQuantity] = useState(initial?.minQuantity ?? 0);
  const [costPrice, setCostPrice] = useState(initial?.costPrice ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      sku: sku || undefined,
      unitType,
      quantity: isEdit ? undefined : quantity,
      minQuantity: minQuantity || undefined,
      costPrice: costPrice || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Chopp Pilsen"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            maxLength={50}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: CHOPP-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unidade de Medida *
          </label>
          <select
            value={unitType}
            onChange={(e) => setUnitType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {UNIT_TYPES.map((ut) => (
              <option key={ut} value={ut}>
                {ut}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade Inicial
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={0}
            step="0.001"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estoque Minimo
          </label>
          <input
            type="number"
            value={minQuantity}
            onChange={(e) => setMinQuantity(Number(e.target.value))}
            min={0}
            step="0.001"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preco de Custo (R$)
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
      </div>

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
          disabled={!name || isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar Item'}
        </button>
      </div>
    </form>
  );
}
