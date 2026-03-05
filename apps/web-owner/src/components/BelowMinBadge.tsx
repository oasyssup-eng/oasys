interface BelowMinBadgeProps {
  quantity: number;
  minQuantity: number | null;
}

export function BelowMinBadge({ quantity, minQuantity }: BelowMinBadgeProps) {
  if (minQuantity === null || quantity > minQuantity) return null;

  if (quantity <= 0) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
        Zerado
      </span>
    );
  }

  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      Abaixo do minimo
    </span>
  );
}
