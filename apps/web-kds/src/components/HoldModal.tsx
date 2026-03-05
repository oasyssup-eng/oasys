import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';

interface HoldModalProps {
  orderId: string;
  onClose: () => void;
}

export function HoldModal({ orderId, onClose }: HoldModalProps) {
  const [reason, setReason] = useState('');
  const [holdMinutes, setHoldMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const holdOrder = useKDSStore((s) => s.holdOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 3) return;

    setLoading(true);
    try {
      const holdUntil = holdMinutes
        ? new Date(Date.now() + Number(holdMinutes) * 60_000).toISOString()
        : undefined;
      await holdOrder(orderId, reason, holdUntil);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Reter Pedido</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
              placeholder="Ex: Cliente pediu para esperar"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Liberar em (minutos, opcional)
            </label>
            <input
              type="number"
              value={holdMinutes}
              onChange={(e) => setHoldMinutes(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Ex: 10"
              min={1}
              max={120}
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
              className="flex-1 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Reter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
