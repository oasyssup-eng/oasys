import { useEffect } from 'react';
import { useKDSStore } from '../stores/kds.store';
import { StationSelector } from '../components/StationSelector';
import { KDSHeader } from '../components/KDSHeader';
import { OrderTicket } from '../components/OrderTicket';
import { HeldSection } from '../components/HeldSection';
import { ReadySection } from '../components/ReadySection';

export function KDSQueue() {
  const { orders, heldOrders, readyOrders, isLoading, loadQueue, loadReadyQueue } = useKDSStore();

  useEffect(() => {
    loadQueue();
    loadReadyQueue();

    const interval = setInterval(() => {
      loadQueue();
      loadReadyQueue();
    }, 15_000);

    return () => clearInterval(interval);
  }, [loadQueue, loadReadyQueue]);

  return (
    <div className="p-2">
      <StationSelector />
      <KDSHeader />

      {isLoading && orders.length === 0 && (
        <div className="text-center text-gray-400 py-12">Carregando fila...</div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <p className="text-xl font-medium">Fila vazia</p>
          <p className="text-sm mt-1">Nenhum pedido pendente ou em preparo</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
        {orders.map((order) => (
          <OrderTicket key={order.id} order={order} />
        ))}
      </div>

      {heldOrders.length > 0 && <HeldSection orders={heldOrders} />}
      {readyOrders.length > 0 && <ReadySection orders={readyOrders} />}
    </div>
  );
}
