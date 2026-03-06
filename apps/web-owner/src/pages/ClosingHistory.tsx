import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';

interface ClosingHistoryItem {
  id: string;
  date: string;
  status: string;
  netRevenue: number | null;
  grossRevenue: number | null;
  totalChecks: number | null;
  paidChecks: number | null;
  reopenCount: number;
  createdAt: string;
}

interface ClosingHistoryResponse {
  closings: ClosingHistoryItem[];
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
};

const STATUS_COLORS: Record<string, string> = {
  CLOSED: 'bg-green-100 text-green-800',
  REOPENED: 'bg-yellow-100 text-yellow-800',
};

function formatBRL(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ClosingHistory() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const queryParams = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);

  const { data, isLoading, error } = useQuery<ClosingHistoryResponse>({
    queryKey: ['closing', 'history', startDate, endDate, offset],
    queryFn: () => apiGet(`/closing/history?${queryParams}`),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  const handleExport = async (closingId: string, format: 'csv' | 'pdf', date: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'}/closing/${closingId}/export/${format}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('oasys_owner_token') ?? ''}`,
          },
        },
      );
      if (!response.ok) throw new Error('Erro ao exportar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fechamento-${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently handle — user will see no download
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Voltar ao Dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Histórico de Fechamentos</h1>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setOffset(0);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Data início"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setOffset(0);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Data fim"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error instanceof Error ? error.message : 'Erro ao carregar histórico'}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : !data || data.closings.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          Nenhum fechamento encontrado
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Receita Líquida
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Receita Bruta
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Contas</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Reaberturas</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.closings.map((closing) => (
                  <tr key={closing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {new Date(closing.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[closing.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[closing.status] ?? closing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {formatBRL(closing.netRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatBRL(closing.grossRevenue)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {closing.paidChecks != null && closing.totalChecks != null
                        ? `${closing.paidChecks}/${closing.totalChecks}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {closing.reopenCount > 0 ? (
                        <span className="text-yellow-600 font-medium">{closing.reopenCount}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleExport(closing.id, 'csv', closing.date)}
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                          title="Exportar CSV"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport(closing.id, 'pdf', closing.date)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                          title="Exportar PDF"
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                disabled={offset === 0}
                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setOffset((o) => o + limit)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
