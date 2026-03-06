import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { useStockStore } from '../stores/stock.store';
import { StockLevelBar } from '../components/StockLevelBar';
import { BelowMinBadge } from '../components/BelowMinBadge';
import { StockItemForm } from '../components/StockItemForm';

interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitType: string;
  minQuantity: number | null;
  costPrice: number | null;
  isActive: boolean;
}

interface StockItemsResponse {
  items: StockItem[];
  total: number;
}

export function StockItemList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { search, isActiveFilter, belowMinFilter, setSearch, setBelowMinFilter } =
    useStockStore();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (isActiveFilter) queryParams.set('isActive', 'true');
  if (belowMinFilter) queryParams.set('belowMin', 'true');

  const { data, isLoading } = useQuery<StockItemsResponse>({
    queryKey: ['stock', 'items', search, isActiveFilter, belowMinFilter],
    queryFn: () => apiGet(`/stock/items?${queryParams.toString()}`),
  });

  const createMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPost<StockItem>('/stock/items', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setShowForm(false);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Erro ao criar item');
    },
  });

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/stock" className="text-sm text-gray-500 hover:text-gray-700">
            ← Voltar ao Estoque
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Itens de Estoque</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + Novo Item
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Novo Item de Estoque
          </h2>
          <StockItemForm
            onSubmit={(data) => createMutation.mutate(data as unknown as Record<string, unknown>)}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={belowMinFilter}
            onChange={(e) => setBelowMinFilter(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          Abaixo do minimo
        </label>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Carregando...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Nenhum item encontrado</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">
                  Nivel
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Custo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/stock/items/${item.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StockLevelBar
                      quantity={item.quantity}
                      minQuantity={item.minQuantity}
                      unitType={item.unitType}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {item.costPrice != null
                      ? `R$ ${item.costPrice.toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <BelowMinBadge
                      quantity={item.quantity}
                      minQuantity={item.minQuantity}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 border-t">
            {data.total} item{data.total !== 1 ? 's' : ''} encontrado{data.total !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
