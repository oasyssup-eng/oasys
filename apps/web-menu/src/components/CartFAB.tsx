import { useNavigate, useParams } from 'react-router-dom';
import { useCartStore } from '../stores/cart.store';
import { formatCurrency } from '../lib/format';

export function CartFAB() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const totalItems = useCartStore((s) => s.totalItems());
  const totalAmount = useCartStore((s) => s.totalAmount());

  if (totalItems === 0) return null;

  return (
    <button
      onClick={() => navigate(`/${slug}/cart`)}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-lg w-[calc(100%-2rem)] bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-3 flex items-center justify-between shadow-lg z-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="bg-orange-400 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
          {totalItems}
        </span>
        <span className="font-medium">Ver sacola</span>
      </div>
      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
    </button>
  );
}
