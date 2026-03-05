interface PreflightItem {
  type: string;
  message: string;
  details?: string;
}

interface PreflightStepProps {
  blockers: PreflightItem[];
  warnings: PreflightItem[];
  acknowledgeWarnings: boolean;
  onToggleAcknowledge: () => void;
}

export function PreflightStep({
  blockers,
  warnings,
  acknowledgeWarnings,
  onToggleAcknowledge,
}: PreflightStepProps) {
  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
            Bloqueios — Impedem o fechamento
          </h3>
          {blockers.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3"
            >
              <span className="text-red-500 mt-0.5 text-lg leading-none">✕</span>
              <div>
                <p className="text-sm font-medium text-red-800">{b.message}</p>
                {b.details && <p className="text-xs text-red-600 mt-0.5">{b.details}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide">
            Avisos — Revise antes de continuar
          </h3>
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3"
            >
              <span className="text-yellow-500 mt-0.5 text-lg leading-none">⚠</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">{w.message}</p>
                {w.details && <p className="text-xs text-yellow-600 mt-0.5">{w.details}</p>}
              </div>
            </div>
          ))}

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledgeWarnings}
              onChange={onToggleAcknowledge}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Estou ciente dos avisos acima e desejo prosseguir com o fechamento
            </span>
          </label>
        </div>
      )}

      {blockers.length === 0 && warnings.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
          <span className="text-green-500 text-lg">✓</span>
          <p className="text-sm font-medium text-green-800">
            Tudo certo! O dia pode ser fechado sem pendências.
          </p>
        </div>
      )}
    </div>
  );
}
