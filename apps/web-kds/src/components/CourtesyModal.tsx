import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';

interface CourtesyModalProps {
  orderId: string;
  onClose: () => void;
}

export function CourtesyModal({ orderId, onClose }: CourtesyModalProps) {
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const markCourtesy = useKDSStore((s) => s.markCourtesy);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 3) return;

    setLoading(true);
    try {
      await markCourtesy(orderId, reason, authorizedBy || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Marcar Cortesia</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
              placeholder="Ex: Erro da cozinha"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Autorizado por (ID do gerente, opcional)
            </label>
            <input
              type="text"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="ID do gerente"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={reason.length < 3 || loading}
              className="flex-1 py-2 rounded-lg bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
