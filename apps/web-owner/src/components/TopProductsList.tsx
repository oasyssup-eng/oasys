interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsListProps {
  products: TopProduct[];
}

export function TopProductsList({ products }: TopProductsListProps) {
  if (products.length === 0) {
    return <p className="text-gray-400 text-sm">Nenhum produto vendido ainda</p>;
  }

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div key={product.productId} className="flex items-center gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
            <p className="text-xs text-gray-500">{product.quantity} un.</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            R$ {product.revenue.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
