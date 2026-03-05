import type { MenuProductDTO } from '@oasys/shared';
import { formatCurrency } from '../lib/format';

interface ProductCardProps {
  product: MenuProductDTO;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const hasDiscount = product.effectivePrice < product.basePrice;

  return (
    <button
      onClick={onClick}
      disabled={!product.isAvailable}
      className={`w-full flex gap-3 p-3 bg-white rounded-lg border border-gray-100 text-left transition-shadow hover:shadow-md ${
        !product.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {/* Image */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🍽️</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 text-sm truncate">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(product.effectivePrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xs text-gray-400 line-through">
                {formatCurrency(product.basePrice)}
              </span>
              {product.priceLabel && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                  {product.priceLabel}
                </span>
              )}
            </>
          )}
        </div>
        {!product.isAvailable && (
          <span className="text-xs text-red-500 mt-1 inline-block">
            Indisponivel
          </span>
        )}
      </div>
    </button>
  );
}
