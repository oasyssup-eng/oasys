import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';
import { useSoundStore } from '../stores/sound.store';

interface BumpButtonProps {
  orderId: string;
  station: string;
}

export function BumpButton({ orderId, station }: BumpButtonProps) {
  const [loading, setLoading] = useState(false);
  const bump = useKDSStore((s) => s.bumpOrder);
  const playBump = useSoundStore((s) => s.playBump);

  const handleBump = async () => {
    setLoading(true);
    try {
      await bump(orderId, station);
      playBump();
      navigator.vibrate?.(100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleBump}
      disabled={loading}
      className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition-colors"
    >
      {loading ? '...' : 'PRONTO'}
    </button>
  );
}
