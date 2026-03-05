import { useKDSStore } from '../stores/kds.store';

export function KDSHeader() {
  const { queueLength, avgPrepTime, heldOrders } = useKDSStore();

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex gap-4 items-center text-sm text-gray-500 py-2 px-1">
      <span>
        Fila: <strong className="text-gray-800">{queueLength}</strong>
      </span>
      <span>
        Tempo medio: <strong className="text-gray-800">{formatTime(avgPrepTime)}</strong>
      </span>
      {heldOrders.length > 0 && (
        <span>
          Retidos: <strong className="text-orange-600">{heldOrders.length}</strong>
        </span>
      )}
    </div>
  );
}
