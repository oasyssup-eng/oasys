interface PickupCardProps {
  orderNumber: number | null;
  items: string[];
  readyAt: string;
  elapsedSinceReady: number;
}

export function PickupCard({
  orderNumber,
  items,
  elapsedSinceReady,
}: PickupCardProps) {
  const isBlinking = elapsedSinceReady > 300; // >5 min

  return (
    <div
      className={`bg-gray-800 rounded-xl p-6 text-center border-2 ${
        isBlinking
          ? 'border-green-400 animate-pulse'
          : 'border-gray-700'
      }`}
    >
      <div className="text-6xl font-bold text-green-400 mb-3">
        #{orderNumber ?? '?'}
      </div>
      <div className="text-sm text-gray-300 space-y-0.5">
        {items.slice(0, 3).map((item, i) => (
          <div key={i}>{item}</div>
        ))}
        {items.length > 3 && (
          <div className="text-gray-500">+{items.length - 3} itens</div>
        )}
      </div>
    </div>
  );
}
