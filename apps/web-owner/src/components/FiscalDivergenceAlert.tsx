import { useState, useEffect } from 'react';
import { apiGet } from '../lib/api';

interface FiscalReport {
  totalChecks: number;
  totalNotes: number;
  missingNotes: number;
  statusBreakdown: Record<string, number>;
}

/**
 * Dashboard banner that warns about fiscal divergences.
 * Calls GET /fiscal/report for today's date range.
 */
export function FiscalDivergenceAlert() {
  const [report, setReport] = useState<FiscalReport | null>(null);

  useEffect(() => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1);

    apiGet<FiscalReport>(
      `/fiscal/report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    )
      .then(setReport)
      .catch(() => {
        // Silent — banner just won't show
      });
  }, []);

  if (!report || report.missingNotes === 0) return null;

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
      <span className="text-amber-600 text-lg">⚠️</span>
      <div>
        <p className="text-sm font-medium text-amber-800">
          Divergencia Fiscal Hoje
        </p>
        <p className="text-xs text-amber-700 mt-1">
          {report.missingNotes} conta(s) paga(s) sem NFC-e emitida de um total
          de {report.totalChecks} contas.
          {(report.statusBreakdown.ERROR ?? 0) > 0 && (
            <> {report.statusBreakdown.ERROR} nota(s) com erro.</>
          )}
        </p>
        <a
          href="/fiscal"
          className="text-xs text-amber-800 font-medium underline mt-1 inline-block"
        >
          Ver Relatorio Fiscal →
        </a>
      </div>
    </div>
  );
}
