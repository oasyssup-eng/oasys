interface QuantityControlProps {
  quantity: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
}

export function QuantityControl({ quantity, onChange, min = 1, max = 99 }: QuantityControlProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
        aria-label="Diminuir quantidade"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-8 h-8 rounded-full border border-orange-500 bg-orange-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-600"
        aria-label="Aumentar quantidade"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
