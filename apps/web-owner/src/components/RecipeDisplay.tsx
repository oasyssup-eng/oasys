interface Ingredient {
  stockItemName: string;
  unitType: string;
  quantityPerUnit: number;
  currentStock?: number;
  isActive?: boolean;
}

interface RecipeDisplayProps {
  productName: string;
  ingredients: Ingredient[];
}

export function RecipeDisplay({ productName, ingredients }: RecipeDisplayProps) {
  if (ingredients.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-2">
        Nenhuma receita cadastrada para {productName}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">
        Ficha Tecnica — {productName}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Ingrediente</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Qtd / Un Vendida</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Estoque Atual</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ingredients.map((ing, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="text-gray-900">{ing.stockItemName}</span>
                  {ing.isActive === false && (
                    <span className="ml-2 text-xs text-red-500">(inativo)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-700">
                  {ing.quantityPerUnit.toFixed(ing.quantityPerUnit % 1 === 0 ? 0 : 3)}{' '}
                  {ing.unitType}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {ing.currentStock != null
                    ? `${ing.currentStock.toFixed(ing.currentStock % 1 === 0 ? 0 : 1)} ${ing.unitType}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
