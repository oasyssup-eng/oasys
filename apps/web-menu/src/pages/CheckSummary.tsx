import { useNavigate, useParams } from 'react-router-dom';
import { useCheckSummary } from '../hooks/useOrders';
import { useSessionStore } from '../stores/session.store';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/format';

export default function CheckSummary() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const context = useSessionStore((s) => s.context);
  const { data: check, isLoading, error } = useCheckSummary(slug!);

  if (isLoading) return <LoadingSpinner />;

  if (error || !check) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">😕</span>
        <p className="text-gray-500 text-sm">Erro ao carregar conta</p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Conta</h1>
        {context?.type === 'TABLE' && context.tableNumber && (
          <p className="text-sm text-gray-500 mt-0.5">Mesa {context.tableNumber}</p>
        )}
      </div>

      {/* Orders breakdown */}
      <div className="px-4 mt-2">
        {check.orders.map((order) => (
          <div key={order.id} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Pedido {order.orderNumber ? `#${order.orderNumber}` : ''}
              </span>
              <span className="text-xs text-gray-400 capitalize">{order.status.toLowerCase()}</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between px-3 py-2 border-b border-gray-50 last:border-b-0">
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-400">
                        {item.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-4 mt-4 pt-4 border-t border-gray-200">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal (itens)</span>
            <span className="text-gray-700">{formatCurrency(check.itemsTotal)}</span>
          </div>

          {check.serviceFeeAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxa de servico</span>
              <span className="text-gray-700">{formatCurrency(check.serviceFeeAmount)}</span>
            </div>
          )}

          {check.tipAmount != null && check.tipAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gorjeta</span>
              <span className="text-gray-700">{formatCurrency(check.tipAmount)}</span>
            </div>
          )}

          {check.discountAmount != null && check.discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Desconto</span>
              <span className="text-green-600">-{formatCurrency(check.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(check.grossTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      {check.payments.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Pagamentos</h2>
          <div className="space-y-2">
            {check.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{payment.method === 'PIX' ? '📱' : '💳'}</span>
                  <span className="text-sm text-gray-700">{payment.method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      payment.status === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {payment.status === 'PAID' ? 'Pago' : payment.status === 'PENDING' ? 'Pendente' : payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining balance */}
      {check.remainingBalance > 0 && (
        <div className="px-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Saldo restante</span>
            <span className="text-lg font-bold text-orange-600">
              {formatCurrency(check.remainingBalance)}
            </span>
          </div>
        </div>
      )}

      {check.totalPaid > 0 && check.remainingBalance <= 0 && (
        <div className="px-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-medium text-green-700 mt-1">Conta paga!</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <button
          onClick={() => navigate(`/${slug}/orders`)}
          className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Ver meus pedidos
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
