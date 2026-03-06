import { PaymentBreakdown } from './PaymentBreakdown';
import { DivergenceList } from './DivergenceList';

interface Revenue {
  grossRevenue: number;
  netRevenue: number;
  serviceFees: number;
  tips: number;
  discounts: number;
  cancellationAmount: number;
  courtesyAmount: number;
  staffMealAmount: number;
}

interface PaymentSummary {
  totalConfirmed: number;
  totalRefunded: number;
  pendingCount: number;
  pendingAmount: number;
  byMethod: Record<string, number>;
}

interface Operations {
  totalChecks: number;
  paidChecks: number;
  openChecks: number;
  avgTicket: number;
  peakHour: number | null;
  peakHourRevenue: number;
}

interface Divergence {
  type: string;
  description: string;
  expected?: number;
  actual?: number;
  difference?: number;
}

interface ClosingResultProps {
  reportId: string;
  date: string;
  revenue: Revenue;
  payments: PaymentSummary;
  operations: Operations;
  divergences: Divergence[];
  onExportCSV: () => void;
  onExportPDF: () => void;
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function ClosingResult({
  reportId,
  date,
  revenue,
  payments,
  operations,
  divergences,
  onExportCSV,
  onExportPDF,
}: ClosingResultProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Fechamento Concluído</h2>
          <p className="text-sm text-gray-500">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportCSV}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          >
            📥 CSV
          </button>
          <button
            onClick={onExportPDF}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          >
            📄 PDF
          </button>
        </div>
      </div>

      {/* Revenue Section */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Resumo Financeiro
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Receita Bruta</p>
            <p className="text-lg font-bold text-gray-900">{formatBRL(revenue.grossRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Receita Líquida</p>
            <p className="text-lg font-bold text-green-700">{formatBRL(revenue.netRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Taxa de Serviço</p>
            <p className="text-lg font-bold text-gray-700">{formatBRL(revenue.serviceFees)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Gorjetas</p>
            <p className="text-lg font-bold text-gray-700">{formatBRL(revenue.tips)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Descontos</p>
            <p className="text-lg font-bold text-orange-600">{formatBRL(revenue.discounts)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cancelamentos</p>
            <p className="text-lg font-bold text-red-600">{formatBRL(revenue.cancellationAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cortesias</p>
            <p className="text-lg font-bold text-gray-600">{formatBRL(revenue.courtesyAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Refeição Funcionário</p>
            <p className="text-lg font-bold text-gray-600">{formatBRL(revenue.staffMealAmount)}</p>
          </div>
        </div>
      </section>

      {/* Operations Section */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Operações
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Contas Pagas</p>
            <p className="text-lg font-bold text-gray-900">
              {operations.paidChecks}/{operations.totalChecks}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Contas Abertas</p>
            <p className="text-lg font-bold text-yellow-600">{operations.openChecks}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ticket Médio</p>
            <p className="text-lg font-bold text-gray-900">{formatBRL(operations.avgTicket)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Horário Pico</p>
            <p className="text-lg font-bold text-gray-900">
              {operations.peakHour != null
                ? `${String(operations.peakHour).padStart(2, '0')}:00`
                : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* Payment Breakdown */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Pagamentos
        </h3>
        <PaymentBreakdown byMethod={payments.byMethod} totalConfirmed={payments.totalConfirmed} />
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span>Confirmado: {formatBRL(payments.totalConfirmed)}</span>
          {payments.totalRefunded > 0 && (
            <span className="text-red-500">Estornado: {formatBRL(payments.totalRefunded)}</span>
          )}
          {payments.pendingCount > 0 && (
            <span className="text-yellow-600">
              Pendente: {payments.pendingCount}x ({formatBRL(payments.pendingAmount)})
            </span>
          )}
        </div>
      </section>

      {/* Divergences */}
      <section className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Divergências
        </h3>
        <DivergenceList divergences={divergences} />
      </section>

      <p className="text-xs text-gray-400 text-center">
        ID do relatório: {reportId}
      </p>
    </div>
  );
}
