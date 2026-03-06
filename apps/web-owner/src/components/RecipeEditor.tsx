import { useState } from 'react';

interface StockItemOption {
  id: string;
  name: string;
  unitType: string;
}

interface RecipeIngredient {
  stockItemId: string;
  stockItemName?: string;
  unitType?: string;
  quantity: number;
}

interface RecipeEditorProps {
  ingredients: RecipeIngredient[];
  availableItems: StockItemOption[];
  onSave: (ingredients: { stockItemId: string; quantity: number }[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RecipeEditor({
  ingredients: initial,
  availableItems,
  onSave,
  onCancel,
  isLoading,
}: RecipeEditorProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initial.length > 0 ? initial : [{ stockItemId: '', quantity: 0 }],
  );

  const addRow = () => {
    setIngredients((prev) => [...prev, { stockItemId: '', quantity: 0 }]);
  };

  const removeRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = ingredients.filter((i) => i.stockItemId && i.quantity > 0);
    if (valid.length === 0) return;
    onSave(valid.map((i) => ({ stockItemId: i.stockItemId, quantity: i.quantity })));
  };

  const usedItemIds = new Set(ingredients.map((i) => i.stockItemId).filter(Boolean));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {ingredients.map((row, index) => {
          const item = availableItems.find((i) => i.id === row.stockItemId);
          return (
            <div key={index} className="flex items-center gap-3">
              <select
                value={row.stockItemId}
                onChange={(e) => updateRow(index, 'stockItemId', e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um item...</option>
                {availableItems
                  .filter((i) => i.id === row.stockItemId || !usedItemIds.has(i.id))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unitType})
                    </option>
                  ))}
              </select>

              <input
                type="number"
                value={row.quantity}
                onChange={(e) => updateRow(index, 'quantity', Number(e.target.value))}
                min={0}
                step="0.001"
                placeholder="Qtd"
                className="w-28 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />

              {item && (
                <span className="text-xs text-gray-400 min-w-[30px]">{item.unitType}</span>
              )}

              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-red-400 hover:text-red-600 text-sm"
                disabled={ingredients.length <= 1}
              >
                x
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-sm text-blue-600 hover:underline"
      >
        + Adicionar ingrediente
      </button>

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
          disabled={isLoading || ingredients.every((i) => !i.stockItemId || i.quantity <= 0)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : 'Salvar Receita'}
        </button>
      </div>
    </form>
  );
}
