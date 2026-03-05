import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCheckStore } from '../stores/check.store';
import { useTableSummary } from '../hooks/useTableStatus';
import { SplitCheckModal } from '../components/SplitCheckModal';
import { MergeCheckModal } from '../components/MergeCheckModal';
import { TransferItemsModal } from '../components/TransferItemsModal';
import { DiscountModal } from '../components/DiscountModal';
import { ServiceFeeToggle } from '../components/ServiceFeeToggle';
import { api } from '../lib/api';

type ModalType = 'split' | 'merge' | 'transfer' | 'discount' | null;

export function TableDetail() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useTableSummary(tableId);
  const {
    activeCheck,
    isLoading: checkLoading,
    error,
    loadCheckDetail,
    deliverOrder,
    clearCheck,
    clearError,
  } = useCheckStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    if (summary?.checkId) {
      void loadCheckDetail(summary.checkId);
    }
    return () => clearCheck();
  }, [summary?.checkId, loadCheckDetail, clearCheck]);

  const handleDismissRequest = async () => {
    if (!tableId) return;
    try {
      await api.post(`/tables/${tableId}/dismiss-request`);
    } catch {
      // Ignore
    }
  };

  const handleDeliver = async (orderId: string) => {
    try {
      await deliverOrder(orderId);
    } catch {
      // Error handled by store
    }
  };

  if (summaryLoading) {
    return <div className="p-4 text-center text-gray-400">Carregando...</div>;
  }

  if (!summary) {
    return (
      <div className="p-4 text-center text-gray-500">Mesa nao encontrada</div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tables')}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Voltar
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          Mesa {summary.number}
        </h1>
        <span className="text-xs text-gray-400">{summary.zone}</span>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm cursor-pointer"
          onClick={clearError}
        >
          {error}
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-lg shadow p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">{summary.checkStatus ?? 'Livre'}</span>
        </div>
        {summary.openDuration && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Aberta ha</span>
            <span className="font-medium">{summary.openDuration}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Itens</span>
          <span className="font-medium">{summary.itemCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">R$ {summary.total.toFixed(2)}</span>
        </div>
        {summary.serviceFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Taxa de servico</span>
            <span className="font-medium">
              R$ {summary.serviceFee.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t pt-2">
          <span>Total</span>
          <span>R$ {summary.grossTotal.toFixed(2)}</span>
        </div>
        {summary.totalPaid > 0 && (
          <>
            <div className="flex justify-between text-sm text-green-600">
              <span>Pago</span>
              <span>R$ {summary.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-blue-600">
              <span>Restante</span>
              <span>R$ {summary.remainingBalance.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Service Fee Toggle */}
      {activeCheck && activeCheck.status === 'OPEN' && (
        <ServiceFeeToggle
          checkId={activeCheck.id}
          currentFee={activeCheck.financials.serviceFee}
        />
      )}

      {/* Orders list */}
      {activeCheck?.orders.map((order) => (
        <div key={order.id} className="bg-white rounded-lg shadow p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">
              Pedido #{order.orderNumber}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.status === 'DELIVERED'
                    ? 'bg-green-100 text-green-700'
                    : order.status === 'READY'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {statusLabel(order.status)}
              </span>
              {order.status === 'READY' && (
                <button
                  onClick={() => handleDeliver(order.id)}
                  disabled={checkLoading}
                  className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Entregar
                </button>
              )}
            </div>
          </div>
          {order.items.map((item) => (
            <div
              key={item.id}
              className={`flex justify-between text-sm ${
                item.isDelivered ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}
            >
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>R$ {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
      ))}

      {/* Action buttons */}
      {activeCheck && activeCheck.status === 'OPEN' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/payment/${activeCheck.id}`)}
            className="py-3 px-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium text-sm hover:bg-green-100"
          >
            Pagar
          </button>
          <button
            onClick={() => setActiveModal('split')}
            className="py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm hover:bg-blue-100"
          >
            Dividir
          </button>
          <button
            onClick={() => setActiveModal('merge')}
            className="py-3 px-4 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 font-medium text-sm hover:bg-purple-100"
          >
            Juntar
          </button>
          <button
            onClick={() => setActiveModal('transfer')}
            className="py-3 px-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 font-medium text-sm hover:bg-orange-100"
          >
            Transferir
          </button>
          <button
            onClick={() => setActiveModal('discount')}
            className="py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 font-medium text-sm hover:bg-yellow-100"
          >
            Desconto
          </button>
          <button
            onClick={handleDismissRequest}
            className="py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium text-sm hover:bg-gray-100"
          >
            Dispensar Chamado
          </button>
        </div>
      )}

      {/* No check state */}
      {!activeCheck && !checkLoading && !summary.checkId && (
        <div className="text-center py-4 text-gray-400">
          Mesa sem conta aberta
        </div>
      )}

      {/* Modals */}
      {activeModal === 'split' && activeCheck && (
        <SplitCheckModal
          checkId={activeCheck.id}
          items={activeCheck.orders.flatMap((o) => o.items)}
          remainingBalance={activeCheck.financials.remainingBalance}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'merge' && activeCheck && (
        <MergeCheckModal
          targetCheckId={activeCheck.id}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'transfer' && activeCheck && (
        <TransferItemsModal
          checkId={activeCheck.id}
          items={activeCheck.orders.flatMap((o) => o.items)}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'discount' && activeCheck && (
        <DiscountModal
          checkId={activeCheck.id}
          grossTotal={activeCheck.financials.grossTotal}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendente';
    case 'CONFIRMED':
      return 'Confirmado';
    case 'PREPARING':
      return 'Preparando';
    case 'READY':
      return 'Pronto';
    case 'DELIVERED':
      return 'Entregue';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}
