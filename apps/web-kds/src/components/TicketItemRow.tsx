interface ItemProps {
  item: {
    quantity: number;
    productName: string;
    station: string | null;
    isThisStation: boolean;
    modifiers: unknown;
    notes: string | null;
  };
}

export function TicketItemRow({ item }: ItemProps) {
  return (
    <div className={`text-sm ${item.isThisStation ? '' : 'opacity-50'}`}>
      <div className="flex gap-2">
        <span className="font-bold text-gray-900 w-6">{item.quantity}x</span>
        <div className="flex-1">
          <span className="text-gray-800">{item.productName}</span>
          {!item.isThisStation && item.station && (
            <span className="text-xs text-gray-400 ml-1">({item.station})</span>
          )}
          {Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
            <div className="text-xs text-gray-400 italic">
              {(item.modifiers as Array<{ name: string }>).map((m: { name: string }) => m.name).join(', ')}
            </div>
          )}
          {item.notes && (
            <div className="text-xs text-orange-600 font-medium">
              {item.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
