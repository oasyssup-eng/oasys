import { useState } from 'react';

interface Alert {
  id: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

interface AlertBannerProps {
  alerts: Alert[];
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
            alert.severity === 'CRITICAL'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{alert.severity === 'CRITICAL' ? '🚨' : '⚠️'}</span>
            <span>{alert.message}</span>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
            className="ml-4 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Fechar alerta"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
