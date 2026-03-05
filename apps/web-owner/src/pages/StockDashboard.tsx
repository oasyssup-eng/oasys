import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { KPICard } from '../components/KPICard';
import { MovementHistory } from '../components/MovementHistory';
import { StockAlertList } from '../components/StockAlertList';
import { CMVCard } from '../components/CMVCard';

interface DashboardMovement {
  id: string;
  stockItemName: string;
  unitType: string;
  type: string;
  quantity: number;
  reason: string | null;
  employeeName: string | null;
  createdAt: string;
}

interface StockDashboardResponse {
  totalItems: number;
  activeItems: number;
  belowMinCount: number;
  totalValue: number;
  unresolvedAlerts: number;
  recentMovements: DashboardMovement[];
}

interface StockAlert {
  id: string;
  severity: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface CMVResponse {
  totalCost: number;
  netRevenue: number;
  cmvPercentage: number;
  startDate: string;
  endDate: string;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function StockDashboard() {
  const { data, isLoading } = useQuery<StockDashboardResponse>({
    queryKey: ['stock', 'dashboard'],
    queryFn: () => apiGet('/stock/dashboard'),
  });

  const { data: alerts } = useQuery<StockAlert[]>({
    queryKey: ['stock', 'alerts'],
    queryFn: () => apiGet('/stock/alerts'),
  });

  // CMV for current month
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().slice(0, 10);

  const { data: cmv } = useQuery<CMVResponse>({
    queryKey: ['stock', 'cmv', startOfMonth, today],
    queryFn: () => apiGet(`/stock/cmv?startDate=${startOfMonth}&endDate=${today}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Carregando estoque...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Sem dados disponiveis
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500">Visao geral do inventario</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/stock/items"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Ver Itens
          </Link>
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Itens Ativos"
          value={String(data.activeItems)}
          color="blue"
        />
        <KPICard
          label="Abaixo do Minimo"
          value={String(data.belowMinCount)}
          color={data.belowMinCount > 0 ? 'red' : 'green'}
        />
        <KPICard
          label="Valor Total"
          value={formatBRL(data.totalValue)}
          color="gray"
        />
        <KPICard
          label="Alertas Pendentes"
          value={String(data.unresolvedAlerts)}
          color={data.unresolvedAlerts > 0 ? 'yellow' : 'green'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Movements */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Movimentacoes Recentes
          </h2>
          <MovementHistory movements={data.recentMovements} />
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Alertas de Estoque
          </h2>
          <StockAlertList alerts={alerts ?? []} />
        </div>
      </div>

      {/* CMV */}
      {cmv && (
        <CMVCard
          totalCost={cmv.totalCost}
          netRevenue={cmv.netRevenue}
          cmvPercentage={cmv.cmvPercentage}
          startDate={cmv.startDate}
          endDate={cmv.endDate}
        />
      )}

      {/* Footer Links */}
      <div className="flex gap-4 text-sm">
        <Link to="/" className="text-blue-600 hover:underline">
          Dashboard Principal →
        </Link>
        <Link to="/stock/items" className="text-blue-600 hover:underline">
          Todos os Itens →
        </Link>
      </div>
    </div>
  );
}
