import { useEffect } from 'react';
import { useKDSStore } from '../stores/kds.store';

export function KDSStats() {
  const { stats, loadStats } = useKDSStore();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  if (!stats) {
    return (
      <div className="text-center text-gray-400 py-12">Carregando estatisticas...</div>
    );
  }

  const { overall } = stats;

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Estatisticas — Hoje</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Pedidos" value={overall.totalOrders} color="blue" />
        <StatCard label="Concluidos" value={overall.completedOrders} color="green" />
        <StatCard label="Cancelados" value={overall.cancelledOrders} color="red" />
        <StatCard
          label="Tempo Medio"
          value={formatTime(overall.avgPrepTimeSeconds)}
          color="orange"
        />
        <StatCard label="Na Fila" value={overall.currentQueueLength} color="yellow" />
        <StatCard label="Retidos" value={overall.currentHeldOrders} color="purple" />
        <StatCard label="Cortesias" value={overall.courtesyOrders} color="pink" />
        <StatCard label="Consumo Interno" value={overall.staffMeals} color="gray" />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.gray}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
