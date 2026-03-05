interface StockLevelBarProps {
  quantity: number;
  minQuantity: number | null;
  unitType: string;
}

export function StockLevelBar({ quantity, minQuantity, unitType }: StockLevelBarProps) {
  const min = minQuantity ?? 0;
  const maxDisplay = min > 0 ? min * 3 : Math.max(quantity, 100);
  const percentage = maxDisplay > 0 ? Math.min((quantity / maxDisplay) * 100, 100) : 0;

  let color: string;
  let textColor: string;

  if (quantity <= 0) {
    color = 'bg-gray-800';
    textColor = 'text-red-700';
  } else if (min > 0 && quantity <= min) {
    color = 'bg-red-500';
    textColor = 'text-red-700';
  } else if (min > 0 && quantity <= min * 2) {
    color = 'bg-yellow-500';
    textColor = 'text-yellow-700';
  } else {
    color = 'bg-green-500';
    textColor = 'text-green-700';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor} min-w-[60px] text-right`}>
        {quantity.toFixed(quantity % 1 === 0 ? 0 : 1)} {unitType}
      </span>
    </div>
  );
}
