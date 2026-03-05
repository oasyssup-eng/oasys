import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';
import { TimerBadge } from './TimerBadge';
import { SourceBadge } from './SourceBadge';
import { CourseBadge } from './CourseBadge';
import { TicketItemRow } from './TicketItemRow';
import { StationProgress } from './StationProgress';
import { BumpButton } from './BumpButton';
import { HoldModal } from './HoldModal';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  station: string | null;
  isThisStation: boolean;
  modifiers: unknown;
  notes: string | null;
}

interface Order {
  id: string;
  orderNumber: number | null;
  status: string;
  source: string;
  courseType: string | null;
  tableNumber: number | null;
  zoneName: string | null;
  createdAt: string;
  elapsedSeconds: number;
  items: OrderItem[];
  stationProgress: Record<string, boolean>;
  priority: string;
}

export function OrderTicket({ order }: { order: Order }) {
  const [showHold, setShowHold] = useState(false);
  const { station } = useKDSStore();
  const bumpStation = station === 'ALL'
    ? Object.keys(order.stationProgress).find((s) => !order.stationProgress[s]) ?? 'KITCHEN'
    : station;

  const borderColor =
    order.priority === 'RUSH'
      ? 'border-red-500'
      : order.priority === 'DELAYED'
        ? 'border-yellow-500'
        : 'border-gray-200';

  return (
    <>
      <div className={`bg-white rounded-xl border-2 ${borderColor} shadow-sm overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              #{order.orderNumber ?? '?'}
            </span>
            {order.tableNumber !== null && (
              <span className="text-xs text-gray-500">
                Mesa {order.tableNumber}
                {order.zoneName ? ` · ${order.zoneName}` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <SourceBadge source={order.source} />
            {order.courseType && <CourseBadge courseType={order.courseType} />}
            <TimerBadge createdAt={order.createdAt} priority={order.priority} />
          </div>
        </div>

        {/* Items */}
        <div className="px-3 py-2 space-y-1">
          {order.items.map((item) => (
            <TicketItemRow key={item.id} item={item} />
          ))}
        </div>

        {/* Station Progress */}
        {Object.keys(order.stationProgress).length > 1 && (
          <StationProgress completions={order.stationProgress} />
        )}

        {/* Actions */}
        <div className="flex gap-1 p-2 border-t">
          <BumpButton orderId={order.id} station={bumpStation} />
          {order.status === 'PENDING' && (
            <button
              onClick={() => setShowHold(true)}
              className="px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
            >
              Reter
            </button>
          )}
        </div>
      </div>

      {showHold && (
        <HoldModal orderId={order.id} onClose={() => setShowHold(false)} />
      )}
    </>
  );
}
