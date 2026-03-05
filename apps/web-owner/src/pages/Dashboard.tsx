import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { useDashboardStore } from '../stores/dashboard.store';
import { KPICard } from '../components/KPICard';
import { HourlyChart } from '../components/HourlyChart';
import { TopProductsList } from '../components/TopProductsList';
import { PaymentBreakdown } from '../components/PaymentBreakdown';
import { AlertBanner } from '../components/AlertBanner';

interface HourlyData {
  hour: number;
  revenue: number;
  orderCount: number;
  checkCount: number;
}

interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface DashboardAlert {
  id: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

interface DashboardTodayResponse {
  date: string;
  isClosed: boolean;
  revenue: {
    grossRevenue: number;
    netRevenue: number;
    serviceFees: number;
    tips: number;
    discounts: number;
    cancellationAmount: number;
    courtesyAmount: number;
    staffMealAmount: number;
  };
  operations: {
    totalChecks: number;
    paidChecks: number;
    openChecks: number;
    avgTicket: number;
    peakHour: number | null;
    peakHourRevenue: number;
  };
  payments: {
    totalConfirmed: number;
    totalRefunded: number;
    pendingCount: number;
    pendingAmount: number;
    byMethod: Record<string, number>;
  };
  hourlyData: HourlyData[];
  topProducts: TopProduct[];
  alerts: DashboardAlert[];
}

interface DashboardComparisonResponse {
  revenueChange: number;
  checksChange: number;
  previousRevenue: number;
  currentRevenue: number;
  previousChecks: number;
  currentChecks: number;
  previousHourlyData: HourlyData[];
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function Dashboard() {
  const { autoRefresh, refreshInterval, toggleAutoRefresh } = useDashboardStore();

  const { data: today, isLoading } = useQuery<DashboardTodayResponse>({
    queryKey: ['dashboard', 'today'],
    queryFn: () => apiGet('/dashboard/today'),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: comparison } = useQuery<DashboardComparisonResponse | null>({
    queryKey: ['dashboard', 'comparison'],
    queryFn: () => apiGet('/dashboard/comparison'),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Carregando dashboard...
      </div>
    );
  }

  if (!today) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date(today.date + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
            {today.isClosed && (
              <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Dia Fechado
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={toggleAutoRefresh}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            Auto-refresh
          </label>
          {!today.isClosed && (
            <Link
              to="/closing"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Fechar Dia
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {today.alerts.length > 0 && <AlertBanner alerts={today.alerts} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          label="Receita Líquida"
          value={formatBRL(today.revenue.netRevenue)}
          change={comparison?.revenueChange}
          color="green"
        />
        <KPICard
          label="Receita Bruta"
          value={formatBRL(today.revenue.grossRevenue)}
          color="blue"
        />
        <KPICard
          label="Ticket Médio"
          value={formatBRL(today.operations.avgTicket)}
          color="blue"
        />
        <KPICard
          label="Contas Pagas"
          value={String(today.operations.paidChecks)}
          change={comparison?.checksChange}
          color="green"
        />
        <KPICard
          label="Contas Abertas"
          value={String(today.operations.openChecks)}
          color={today.operations.openChecks > 0 ? 'yellow' : 'gray'}
        />
        <KPICard
          label="Taxa de Serviço"
          value={formatBRL(today.revenue.serviceFees)}
          color="gray"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Faturamento por Hora
          </h2>
          <HourlyChart
            current={today.hourlyData}
            previous={comparison?.previousHourlyData}
          />
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pagamentos
          </h2>
          <PaymentBreakdown
            byMethod={today.payments.byMethod}
            totalConfirmed={today.payments.totalConfirmed}
          />
          <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-1">
            <p>Confirmado: {formatBRL(today.payments.totalConfirmed)}</p>
            {today.payments.totalRefunded > 0 && (
              <p className="text-red-500">Estornado: {formatBRL(today.payments.totalRefunded)}</p>
            )}
            {today.payments.pendingCount > 0 && (
              <p className="text-yellow-600">
                Pendente: {today.payments.pendingCount}x ({formatBRL(today.payments.pendingAmount)})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Top 5 Produtos
          </h2>
          <TopProductsList products={today.topProducts} />
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Resumo do Dia
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cancelamentos</span>
              <span className="font-medium text-red-600">
                {formatBRL(today.revenue.cancellationAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descontos</span>
              <span className="font-medium text-orange-600">
                {formatBRL(today.revenue.discounts)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cortesias</span>
              <span className="font-medium text-gray-700">
                {formatBRL(today.revenue.courtesyAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Refeição Funcionário</span>
              <span className="font-medium text-gray-700">
                {formatBRL(today.revenue.staffMealAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gorjetas</span>
              <span className="font-medium text-gray-700">
                {formatBRL(today.revenue.tips)}
              </span>
            </div>
            {today.operations.peakHour != null && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Horário de Pico</span>
                <span className="font-medium text-blue-600">
                  {String(today.operations.peakHour).padStart(2, '0')}:00 (
                  {formatBRL(today.operations.peakHourRevenue)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex gap-4 text-sm">
        <Link to="/closing/history" className="text-blue-600 hover:underline">
          Histórico de Fechamentos →
        </Link>
        <Link to="/fiscal" className="text-blue-600 hover:underline">
          Notas Fiscais →
        </Link>
        <Link to="/stock" className="text-blue-600 hover:underline">
          Estoque →
        </Link>
      </div>
    </div>
  );
}
