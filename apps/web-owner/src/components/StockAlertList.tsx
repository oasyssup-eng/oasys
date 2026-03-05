interface StockAlert {
  id: string;
  severity: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface StockAlertListProps {
  alerts: StockAlert[];
}

export function StockAlertList({ alerts }: StockAlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        Nenhum alerta de estoque
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg p-3 border ${
            alert.severity === 'CRITICAL'
              ? 'bg-red-50 border-red-200'
              : 'bg-yellow-50 border-yellow-200'
          } ${alert.isRead ? 'opacity-60' : ''}`}
        >
          <span
            className={`text-lg leading-none mt-0.5 ${
              alert.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'
            }`}
          >
            {alert.severity === 'CRITICAL' ? '!' : '!'}
          </span>
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${
                alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
              }`}
            >
              {alert.message}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(alert.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
