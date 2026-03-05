import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';

interface CourtesyModalProps {
  orderId: string;
  orderTotal: number;
  onClose: () => void;
}

export function CourtesyModal({ orderId, orderTotal, onClose }: CourtesyModalProps) {
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const markCourtesy = useKDSStore((s) => s.markCourtesy);

  const requiresAuth = orderTotal > 50;
  const authMissing = requiresAuth && authorizedBy.trim().length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 3) return;
    if (authMissing) return;

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

        {requiresAuth && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium">
              Pedido acima de R$50 ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderTotal)})
              — autorizacao de gerente obrigatoria.
            </p>
          </div>
        )}

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
              Autorizado por (ID do gerente{requiresAuth ? '' : ', opcional'})
              {requiresAuth && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
              type="text"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className={`w-full border rounded-lg p-2 text-sm ${requiresAuth && authMissing ? 'border-red-300 bg-red-50' : ''}`}
              placeholder="ID do gerente"
              required={requiresAuth}
            />
            {requiresAuth && authMissing && (
              <p className="text-xs text-red-500 mt-1">Obrigatorio para cortesias acima de R$50</p>
            )}
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
              disabled={reason.length < 3 || authMissing || loading}
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
