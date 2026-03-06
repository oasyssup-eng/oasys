import { useState } from 'react';
import { apiPost } from '../lib/api';

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
}

interface Props {
  note: FiscalNote;
  onClose: () => void;
  onUpdate: () => void;
}

export function FiscalNoteDetail({ note, onClose, onUpdate }: Props) {
  const [justification, setJustification] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);

  const handleCancel = async () => {
    if (justification.length < 15) return;
    setCancelling(true);
    setError(null);
    try {
      await apiPost(`/fiscal/notes/${note.id}/cancel`, { justification });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    try {
      await apiPost(`/fiscal/notes/${note.id}/retry`);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao retentar');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Detalhes da Nota</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <DetailRow label="Status" value={note.status} />
          <DetailRow label="Tipo" value={note.type} />
          <DetailRow label="Referencia" value={note.externalRef} mono />
          <DetailRow label="Numero" value={note.number ?? '—'} />
          <DetailRow label="Serie" value={note.series ?? '—'} />
          <DetailRow
            label="Chave de Acesso"
            value={note.accessKey ?? '—'}
            mono
          />
          <DetailRow
            label="Valor"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(Number(note.totalAmount))}
          />
          <DetailRow label="CPF" value={note.customerCpf ?? '—'} />
          <DetailRow
            label="Emitida em"
            value={
              note.issuedAt
                ? new Date(note.issuedAt).toLocaleString('pt-BR')
                : '—'
            }
          />
          <DetailRow
            label="Criada em"
            value={new Date(note.createdAt).toLocaleString('pt-BR')}
          />
          <DetailRow
            label="Tentativas"
            value={String(note.retryCount)}
          />

          {note.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-800">Erro:</p>
              <p className="text-sm text-red-700 mt-1">{note.errorMessage}</p>
            </div>
          )}

          {note.danfeUrl && (
            <a
              href={note.danfeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
            >
              Abrir DANFE
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {(note.status === 'ERROR' || note.status === 'REJECTED') && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
            >
              {retrying ? 'Reenviando...' : 'Reenviar para SEFAZ'}
            </button>
          )}

          {note.status === 'AUTHORIZED' && !showCancelForm && (
            <button
              onClick={() => setShowCancelForm(true)}
              className="w-full py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              Cancelar Nota
            </button>
          )}

          {showCancelForm && (
            <div className="p-3 bg-red-50 rounded-lg space-y-2">
              <p className="text-xs text-red-700 font-medium">
                Justificativa (min. 15 caracteres):
              </p>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full border rounded p-2 text-sm"
                rows={2}
                placeholder="Motivo do cancelamento..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="flex-1 py-1.5 bg-gray-100 rounded text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={justification.length < 15 || cancelling}
                  className="flex-1 py-1.5 bg-red-600 text-white rounded text-sm font-bold disabled:opacity-50"
                >
                  {cancelling ? '...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm text-gray-900 text-right max-w-[60%] break-all ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
