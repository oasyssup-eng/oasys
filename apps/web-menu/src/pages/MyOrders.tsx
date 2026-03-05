import { useNavigate, useParams } from 'react-router-dom';
import { useMyOrders } from '../hooks/useOrders';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency, formatTime } from '../lib/format';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Recebido', color: 'bg-blue-100 text-blue-700' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  PREPARING: { label: 'Preparando', color: 'bg-orange-100 text-orange-700' },
  READY: { label: 'Pronto', color: 'bg-green-100 text-green-700' },
  DELIVERED: { label: 'Entregue', color: 'bg-gray-100 text-gray-600' },
  HELD: { label: 'Aguardando pagamento', color: 'bg-yellow-100 text-yellow-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
};

export default function MyOrders() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: orders, isLoading, error } = useMyOrders(slug!);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">😕</span>
        <p className="text-gray-500 text-sm">Erro ao carregar pedidos</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState message="Voce ainda nao fez nenhum pedido" icon="📋" />
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate(`/${slug}/menu`)}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            Ver cardapio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Meus pedidos</h1>
      </div>

      <div className="px-4 space-y-3">
        {orders.map((order) => {
          const status = statusConfig[order.status] ?? { label: 'Recebido', color: 'bg-blue-100 text-blue-700' };
          return (
            <button
              key={order.id}
              onClick={() => navigate(`/${slug}/orders/${order.id}`)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {order.orderNumber && (
                    <span className="text-sm font-bold text-gray-900">
                      #{order.orderNumber}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatTime(order.createdAt)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                {order.items.map((item) => (
                  <span key={item.id}>
                    {item.quantity}x {item.productName}
                    {order.items.indexOf(item) < order.items.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(order.total)}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom action */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => navigate(`/${slug}/check`)}
          className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Ver conta completa
        </button>
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          Fazer novo pedido
        </button>
      </div>
    </div>
  );
}
