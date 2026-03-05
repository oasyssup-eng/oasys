import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../stores/notification.store';

export function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (notification: {
    id: string;
    isRead: boolean;
    type: string;
    metadata: Record<string, unknown> | null;
  }) => {
    if (!notification.isRead) {
      await markRead(notification.id);
    }

    // Navigate to relevant page based on type
    const tableId = notification.metadata?.tableId as string | undefined;
    if (tableId) {
      navigate(`/tables/${tableId}`);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Notificacoes</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          Nenhuma notificacao
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => void handleNotificationClick(n)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                n.isRead
                  ? 'bg-white border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(n.type)}</span>
                    <span
                      className={`text-sm font-semibold ${
                        n.isRead ? 'text-gray-700' : 'text-gray-900'
                      }`}
                    >
                      {n.title}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      n.isRead ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {n.message}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatTime(n.createdAt)}
                </span>
              </div>
              {!n.isRead && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'ORDER_READY':
    case 'order.ready':
      return '🔔';
    case 'ORDER_NEW':
    case 'order.new_from_menu':
      return '📋';
    case 'TABLE_REQUEST':
    case 'table.service_request':
      return '🖐';
    case 'PAYMENT_CONFIRMED':
    case 'check.payment_received':
      return '💰';
    case 'STOCK_LOW':
      return '📦';
    case 'SYSTEM':
      return '⚙';
    default:
      return '📌';
  }
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
}
