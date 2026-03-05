import { useKDSStore } from '../stores/kds.store';

interface HeldOrder {
  id: string;
  orderNumber: number | null;
  holdUntil: string | null;
  items: Array<{ productName: string; quantity: number }>;
}

export function HeldSection({ orders }: { orders: HeldOrder[] }) {
  const releaseOrder = useKDSStore((s) => s.releaseOrder);

  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-2">
        Retidos ({orders.length})
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {orders.map((order) => {
          const countdown = order.holdUntil
            ? Math.max(0, Math.floor((new Date(order.holdUntil).getTime() - Date.now()) / 60_000))
            : null;

          return (
            <div
              key={order.id}
              className="bg-orange-50 border border-orange-200 rounded-xl p-3 min-w-[160px] flex-shrink-0"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-orange-800">
                  #{order.orderNumber ?? '?'}
                </span>
                {countdown !== null && (
                  <span className="text-xs text-orange-500 font-mono">
                    {countdown}m
                  </span>
                )}
              </div>
              <div className="text-xs text-orange-700 space-y-0.5 mb-2">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i}>
                    {item.quantity}x {item.productName}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-orange-400">
                    +{order.items.length - 3} itens
                  </div>
                )}
              </div>
              <button
                onClick={() => releaseOrder(order.id)}
                className="w-full py-1 rounded bg-orange-600 text-white text-xs font-bold hover:bg-orange-700"
              >
                Liberar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
