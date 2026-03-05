import { useKDSStore } from '../stores/kds.store';
import { useAuthStore } from '../stores/auth.store';
import { RecallButton } from './RecallButton';

interface ReadyOrder {
  id: string;
  orderNumber: number | null;
  status: string;
  source: string;
  tableNumber: number | null;
  readyAt: string;
  items: Array<{ productName: string; quantity: number }>;
}

export function ReadySection({ orders }: { orders: ReadyOrder[] }) {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'MANAGER' || user?.role === 'OWNER';

  if (orders.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider mb-2">
        Prontos ({orders.length})
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {orders.map((order) => (
          <ReadyCard key={order.id} order={order} canRecall={isManager} />
        ))}
      </div>
    </div>
  );
}

function ReadyCard({
  order,
  canRecall,
}: {
  order: ReadyOrder;
  canRecall: boolean;
}) {
  const elapsedMin = Math.floor(
    (Date.now() - new Date(order.readyAt).getTime()) / 60_000,
  );

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 min-w-[180px] flex-shrink-0">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-green-800">
          #{order.orderNumber ?? '?'}
        </span>
        <span className="text-xs text-green-500 font-mono">
          {elapsedMin}m
        </span>
      </div>
      {order.tableNumber !== null && (
        <div className="text-xs text-green-600 mb-1">Mesa {order.tableNumber}</div>
      )}
      <div className="text-xs text-green-700 space-y-0.5 mb-2">
        {order.items.slice(0, 3).map((item, i) => (
          <div key={i}>
            {item.quantity}x {item.productName}
          </div>
        ))}
        {order.items.length > 3 && (
          <div className="text-green-400">
            +{order.items.length - 3} itens
          </div>
        )}
      </div>
      {canRecall && <RecallButton orderId={order.id} />}
    </div>
  );
}
