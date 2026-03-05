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

  const { overall, byStation, topProducts } = stats;

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const stationColorMap: Record<string, string> = {
    BAR: 'bg-blue-50 border-blue-200 text-blue-700',
    KITCHEN: 'bg-orange-50 border-orange-200 text-orange-700',
    GRILL: 'bg-red-50 border-red-200 text-red-700',
    DESSERT: 'bg-purple-50 border-purple-200 text-purple-700',
    OTHER: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-bold text-gray-800">Estatisticas — Hoje</h2>

      {/* Overall Stats */}
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

      {/* By Station Breakdown */}
      {byStation && Object.keys(byStation).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
            Por Estacao
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(byStation).map(([station, data]) => (
              <div
                key={station}
                className={`rounded-xl border p-4 ${stationColorMap[station] ?? stationColorMap.OTHER}`}
              >
                <div className="text-xs font-medium opacity-80">{station}</div>
                <div className="text-2xl font-bold mt-1">{data.totalQuantity}</div>
                <div className="text-xs opacity-60 mt-0.5">{data.orderItems} itens distintos</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts && topProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
            Produtos Mais Pedidos
          </h3>
          <div className="bg-white rounded-xl border divide-y">
            {topProducts.map((product, i) => (
              <div key={product.productId} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-6">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{product.productName}</div>
                    {product.station && (
                      <div className="text-xs text-gray-400">{product.station}</div>
                    )}
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-700">{product.totalQuantity}x</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
