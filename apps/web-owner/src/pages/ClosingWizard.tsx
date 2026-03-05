import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiGet } from '../lib/api';
import { PreflightStep } from '../components/PreflightStep';
import { ClosingResult } from '../components/ClosingResult';

// ── Types ────────────────────────────────────────────────────────────

interface PreflightItem {
  type: string;
  message: string;
  details?: string;
}

interface PreflightResponse {
  canClose: boolean;
  blockers: PreflightItem[];
  warnings: PreflightItem[];
  summary: {
    totalChecks: number;
    openChecks: number;
    paidChecks: number;
    totalPayments: number;
    pendingPayments: number;
  };
}

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

interface ClosingResponse {
  report: { id: string };
  revenue: Revenue;
  payments: PaymentSummary;
  operations: Operations;
  reconciliation: {
    isBalanced: boolean;
    divergences: Divergence[];
  };
}

// ── Wizard Steps ─────────────────────────────────────────────────────

type WizardStep = 'preflight' | 'review' | 'confirm' | 'result';

export function ClosingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('preflight');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preflight state
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);

  // Closing input state
  const [closingNotes, setClosingNotes] = useState('');

  // Result state
  const [closingResult, setClosingResult] = useState<ClosingResponse | null>(null);
  const [closingDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  // ── Step 1: Preflight ──────────────────────────────────────────────

  const runPreflight = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<PreflightResponse>('/closing/preflight');
      setPreflight(data);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar pré-requisitos');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Execute Closing ────────────────────────────────────────

  const executeClosing = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<ClosingResponse>('/closing/execute', {
        date: closingDate,
        acknowledgeWarnings,
        closingNotes: closingNotes.trim() || undefined,
      });
      setClosingResult(data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar fechamento');
    } finally {
      setLoading(false);
    }
  };

  // ── Export handlers ────────────────────────────────────────────────

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!closingResult) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'}/closing/${closingResult.report.id}/export/${format}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('oasys_owner_token') ?? ''}`,
          },
        },
      );
      if (!response.ok) throw new Error('Erro ao exportar');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fechamento-${closingDate}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  const STEP_LABELS: Record<WizardStep, string> = {
    preflight: 'Verificação',
    review: 'Revisão',
    confirm: 'Confirmação',
    result: 'Resultado',
  };

  const STEPS: WizardStep[] = ['preflight', 'review', 'confirm', 'result'];

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Voltar ao Dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Fechamento do Dia</h1>
      <p className="text-sm text-gray-500 mb-6">
        {new Date(closingDate + 'T12:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const isActive = s === step;
          const isDone = STEPS.indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm ${isActive ? 'font-medium text-gray-900' : 'text-gray-400'}`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-gray-200 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step: Preflight */}
      {step === 'preflight' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Clique abaixo para verificar se o dia está pronto para ser fechado. Serão verificados
            caixas abertos, contas pendentes, pagamentos e notas fiscais.
          </p>
          <button
            onClick={runPreflight}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Iniciar Verificação'}
          </button>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && preflight && (
        <div className="space-y-6">
          <PreflightStep
            blockers={preflight.blockers}
            warnings={preflight.warnings}
            acknowledgeWarnings={acknowledgeWarnings}
            onToggleAcknowledge={() => setAcknowledgeWarnings((v) => !v)}
          />

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Resumo
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Total de contas:</span>{' '}
                <span className="font-medium">{preflight.summary.totalChecks}</span>
              </div>
              <div>
                <span className="text-gray-500">Contas pagas:</span>{' '}
                <span className="font-medium">{preflight.summary.paidChecks}</span>
              </div>
              <div>
                <span className="text-gray-500">Contas abertas:</span>{' '}
                <span className="font-medium text-yellow-600">
                  {preflight.summary.openChecks}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Pagamentos pendentes:</span>{' '}
                <span className="font-medium text-yellow-600">
                  {preflight.summary.pendingPayments}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('preflight')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={
                !preflight.canClose ||
                (preflight.warnings.length > 0 && !acknowledgeWarnings)
              }
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prosseguir
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-yellow-800 mb-2">Confirme o fechamento</h3>
            <p className="text-sm text-yellow-700">
              Ao confirmar, será gerado o relatório diário com todas as consolidações financeiras e
              operacionais. Esta ação pode ser revertida (reaberta) até 3 vezes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações do fechamento (opcional)
            </label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex: Faltou troco no caixa 2, evento especial..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">{closingNotes.length}/1000</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('review')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Voltar
            </button>
            <button
              onClick={executeClosing}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Fechando...' : 'Confirmar Fechamento'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Result */}
      {step === 'result' && closingResult && (
        <div className="space-y-6">
          <ClosingResult
            reportId={closingResult.report.id}
            date={closingDate}
            revenue={closingResult.revenue}
            payments={closingResult.payments}
            operations={closingResult.operations}
            divergences={closingResult.reconciliation.divergences}
            onExportCSV={() => handleExport('csv')}
            onExportPDF={() => handleExport('pdf')}
          />

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </button>
            <button
              onClick={() => navigate('/closing/history')}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Ver Histórico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
