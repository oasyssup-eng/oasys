import { useParams, useNavigate } from 'react-router-dom';
import { useOrderDetail } from '../hooks/useOrders';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useSessionStore } from '../stores/session.store';
import { OrderStatusTimeline } from '../components/OrderStatusTimeline';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatTime } from '../lib/format';
import type { OrderStatus } from '@oasys/shared';

const statusMessages: Record<string, { title: string; subtitle: string }> = {
  PENDING: {
    title: 'Pedido recebido!',
    subtitle: 'Aguardando confirmacao da cozinha',
  },
  CONFIRMED: {
    title: 'Pedido confirmado!',
    subtitle: 'Seu pedido foi aceito e sera preparado em breve',
  },
  PREPARING: {
    title: 'Preparando seu pedido',
    subtitle: 'A cozinha esta trabalhando no seu pedido',
  },
  READY: {
    title: 'Pedido pronto! 🎉',
    subtitle: 'Seu pedido esta pronto para retirada',
  },
  DELIVERED: {
    title: 'Entregue!',
    subtitle: 'Bom apetite!',
  },
  HELD: {
    title: 'Aguardando pagamento',
    subtitle: 'Seu pedido sera preparado apos o pagamento',
  },
  CANCELLED: {
    title: 'Pedido cancelado',
    subtitle: 'Este pedido foi cancelado',
  },
};

export default function OrderTracking() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const sessionToken = useSessionStore((s) => s.sessionToken);
  const context = useSessionStore((s) => s.context);

  const { data: order, isLoading, error } = useOrderDetail(slug!, id);
  const { status: wsStatus, connected } = useOrderStatus(id, sessionToken);

  // Use WebSocket status if available, otherwise use polling data
  const currentStatus: OrderStatus = wsStatus ?? order?.status ?? 'PENDING';
  const statusInfo = statusMessages[currentStatus] ?? { title: 'Pedido recebido!', subtitle: 'Aguardando confirmacao' };

  if (isLoading) return <LoadingSpinner />;

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">😕</span>
        <p className="text-gray-500 text-sm">Pedido nao encontrado</p>
        <button
          onClick={() => navigate(`/${slug}/orders`)}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
        >
          Meus pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Status header */}
      <div className="px-4 pt-6 pb-4 text-center">
        <h1 className="text-xl font-bold text-gray-900">{statusInfo.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{statusInfo.subtitle}</p>

        {/* Order number */}
        {order.orderNumber && (
          <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
            <span className="text-sm text-gray-600">Pedido</span>
            <span className="text-lg font-bold text-orange-600">#{order.orderNumber}</span>
          </div>
        )}

        {/* Counter pickup code */}
        {context?.type === 'COUNTER' && order.orderNumber && currentStatus === 'READY' && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-medium">SENHA PARA RETIRADA</p>
            <p className="text-3xl font-bold text-green-700 mt-1">#{order.orderNumber}</p>
          </div>
        )}
      </div>

      {/* Status timeline */}
      {currentStatus !== 'HELD' && currentStatus !== 'CANCELLED' && (
        <OrderStatusTimeline status={currentStatus} />
      )}

      {/* WebSocket status indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-xs text-gray-400">
          {connected ? 'Atualizacao em tempo real' : 'Atualizando automaticamente'}
        </span>
      </div>

      {/* Order details */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Itens do pedido</h2>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {order.items.map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <span className="text-sm text-gray-900">
                    {item.quantity}x {item.productName}
                  </span>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.modifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>
                  )}
                </div>
                <span className="text-sm text-gray-600 font-medium ml-3">
                  {formatCurrency(item.totalPrice)}
                </span>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 bg-gray-50 flex justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Time */}
      <div className="px-4 mt-4">
        <p className="text-xs text-gray-400 text-center">
          Pedido feito as {formatTime(order.createdAt)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          Fazer novo pedido
        </button>
        <button
          onClick={() => navigate(`/${slug}/orders`)}
          className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Meus pedidos
        </button>
      </div>
    </div>
  );
}
