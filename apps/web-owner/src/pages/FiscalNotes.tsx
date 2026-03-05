import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { FiscalNoteDetail } from '../components/FiscalNoteDetail';

interface FiscalNote {
  id: string;
  checkId: string;
  externalRef: string;
  status: string;
  type: string;
  number: string | null;
  series: string | null;
  accessKey: string | null;
  danfeUrl: string | null;
  totalAmount: number;
  customerCpf: string | null;
  errorMessage: string | null;
  retryCount: number;
  issuedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  check: {
    id: string;
    tableId: string | null;
    totalAmount: number | null;
  };
}

interface FiscalNotesResponse {
  notes: FiscalNote[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'AUTHORIZED', label: 'Autorizada' },
  { value: 'REJECTED', label: 'Rejeitada' },
  { value: 'ERROR', label: 'Erro' },
  { value: 'CANCELLED', label: 'Cancelada' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  AUTHORIZED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export function FiscalNotes() {
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<FiscalNote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);

      const data = await apiGet<FiscalNotesResponse>(`/fiscal/notes?${params}`);
      setNotes(data.notes);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleRetry = async (noteId: string) => {
    try {
      await apiPost(`/fiscal/notes/${noteId}/retry`);
      loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao retentar');
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notas Fiscais</h1>
        <div className="flex gap-3 items-center">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && notes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : notes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          Nenhuma nota fiscal encontrada
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Conta
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Valor
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {note.number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(note.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {note.checkId.slice(-8)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(note.totalAmount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[note.status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {note.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelectedNote(note)}
                          className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Ver
                        </button>
                        {(note.status === 'ERROR' ||
                          note.status === 'REJECTED') && (
                          <button
                            onClick={() => handleRetry(note.id)}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                          >
                            Retentar
                          </button>
                        )}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                Proximo
              </button>
            </div>
          )}
        </>
      )}

      {selectedNote && (
        <FiscalNoteDetail
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdate={loadNotes}
        />
      )}
    </div>
  );
}
