import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';

interface RecallButtonProps {
  orderId: string;
}

export function RecallButton({ orderId }: RecallButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const recall = useKDSStore((s) => s.recallOrder);

  const handleRecall = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    setLoading(true);
    try {
      await recall(orderId);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <button
      onClick={handleRecall}
      disabled={loading}
      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
        confirming
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-red-50 text-red-600 hover:bg-red-100'
      } disabled:opacity-50`}
    >
      {loading ? '...' : confirming ? 'Confirmar?' : 'Retornar'}
    </button>
  );
}
