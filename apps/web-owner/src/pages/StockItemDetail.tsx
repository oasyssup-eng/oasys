import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { StockLevelBar } from '../components/StockLevelBar';
import { BelowMinBadge } from '../components/BelowMinBadge';
import { MovementForm } from '../components/MovementForm';
import { MovementHistory } from '../components/MovementHistory';
import { RecipeDisplay } from '../components/RecipeDisplay';
import { RecipeEditor } from '../components/RecipeEditor';
import { StockItemForm } from '../components/StockItemForm';

interface Movement {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  reference: string | null;
  employeeName: string | null;
  costPrice: number | null;
  createdAt: string;
}

interface UsedInProduct {
  productId: string;
  productName: string;
  quantityPerUnit: number;
}

interface StockItemDetail {
  id: string;
  unitId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitType: string;
  minQuantity: number | null;
  costPrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  movements: Movement[];
  usedInProducts: UsedInProduct[];
}

interface StockItemOption {
  id: string;
  name: string;
  unitType: string;
}

interface RecipeResponse {
  productId: string;
  productName: string;
  ingredients: Array<{
    id: string;
    stockItemId: string;
    stockItemName: string;
    unitType: string;
    quantityPerUnit: number;
    currentStock: number;
    isActive: boolean;
  }>;
}

export function StockItemDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showRecipeEditor, setShowRecipeEditor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: item, isLoading } = useQuery<StockItemDetail>({
    queryKey: ['stock', 'item', id],
    queryFn: () => apiGet(`/stock/items/${id}`),
    enabled: !!id,
  });

  // Fetch all stock items for recipe editor dropdown
  const { data: allItems } = useQuery<{ items: StockItemOption[] }>({
    queryKey: ['stock', 'items-for-recipe'],
    queryFn: () => apiGet('/stock/items?limit=100'),
  });

  const movementMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPost('/stock/movements', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setShowMovementForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao registrar movimentacao');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPut(`/stock/items/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setShowEditForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item');
    },
  });

  const recipeMutation = useMutation({
    mutationFn: ({ productId, ingredients }: { productId: string; ingredients: { stockItemId: string; quantity: number }[] }) =>
      apiPut<RecipeResponse>(`/stock/recipes/${productId}`, { ingredients }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setShowRecipeEditor(null);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao salvar receita');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Carregando...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Item nao encontrado
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/stock/items" className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar aos Itens
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="text-sm text-gray-500">
              {item.sku ? `SKU: ${item.sku}` : 'Sem SKU'} — {item.unitType}
              {!item.isActive && (
                <span className="ml-2 text-red-500 font-medium">(Inativo)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditForm(!showEditForm)}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Editar
            </button>
            <button
              onClick={() => setShowMovementForm(!showMovementForm)}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Nova Movimentacao
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stock Level */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Nivel de Estoque
          </h2>
          <BelowMinBadge quantity={item.quantity} minQuantity={item.minQuantity} />
        </div>
        <StockLevelBar
          quantity={item.quantity}
          minQuantity={item.minQuantity}
          unitType={item.unitType}
        />
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500">Quantidade</p>
            <p className="font-bold text-gray-900">
              {item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 1)} {item.unitType}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Minimo</p>
            <p className="font-medium text-gray-700">
              {item.minQuantity != null
                ? `${item.minQuantity} ${item.unitType}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Custo Unitario</p>
            <p className="font-medium text-gray-700">
              {item.costPrice != null ? `R$ ${item.costPrice.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {showEditForm && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Editar Item
          </h2>
          <StockItemForm
            initial={{
              name: item.name,
              sku: item.sku ?? undefined,
              unitType: item.unitType,
              minQuantity: item.minQuantity ?? undefined,
              costPrice: item.costPrice ?? undefined,
            }}
            onSubmit={(data) => updateMutation.mutate(data as unknown as Record<string, unknown>)}
            onCancel={() => setShowEditForm(false)}
            isLoading={updateMutation.isPending}
            isEdit
          />
        </div>
      )}

      {/* Movement Form */}
      {showMovementForm && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Nova Movimentacao
          </h2>
          <MovementForm
            stockItemId={item.id}
            stockItemName={item.name}
            currentQuantity={item.quantity}
            unitType={item.unitType}
            onSubmit={(data) => movementMutation.mutate(data as Record<string, unknown>)}
            onCancel={() => setShowMovementForm(false)}
            isLoading={movementMutation.isPending}
          />
        </div>
      )}

      {/* Used in Products / Recipes */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Usado em Produtos
        </h2>
        {item.usedInProducts.length === 0 ? (
          <p className="text-sm text-gray-400">Este item nao e usado em nenhuma receita</p>
        ) : (
          <div className="space-y-2">
            {item.usedInProducts.map((p) => (
              <div
                key={p.productId}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-sm text-gray-900">{p.productName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {p.quantityPerUnit.toFixed(p.quantityPerUnit % 1 === 0 ? 0 : 3)}{' '}
                    {item.unitType}/un
                  </span>
                  <button
                    onClick={() => setShowRecipeEditor(p.productId)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Editar receita
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recipe Editor */}
        {showRecipeEditor && allItems && (
          <div className="mt-4 pt-4 border-t">
            <RecipeEditor
              ingredients={
                item.usedInProducts
                  .filter((p) => p.productId === showRecipeEditor)
                  .map((p) => ({
                    stockItemId: item.id,
                    stockItemName: item.name,
                    unitType: item.unitType,
                    quantity: p.quantityPerUnit,
                  }))
              }
              availableItems={allItems.items.map((i) => ({
                id: i.id,
                name: i.name,
                unitType: i.unitType,
              }))}
              onSave={(ingredients) =>
                recipeMutation.mutate({ productId: showRecipeEditor, ingredients })
              }
              onCancel={() => setShowRecipeEditor(null)}
              isLoading={recipeMutation.isPending}
            />
          </div>
        )}
      </div>

      {/* Movement History */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historico de Movimentacoes
        </h2>
        <MovementHistory movements={item.movements} />
      </div>
    </div>
  );
}
