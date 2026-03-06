import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCartStore, type CartItem } from '../stores/cart.store';
import { useSessionStore } from '../stores/session.store';
import { useCreateOrder } from '../hooks/useOrders';
import { useProducts } from '../hooks/useMenu';
import { QuantityControl } from '../components/QuantityControl';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency } from '../lib/format';

function CartItemRow({ item, isUnavailable }: { item: CartItem; isUnavailable: boolean }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const modTotal = item.modifiers.reduce((s, m) => s + m.price * m.quantity, 0);
  const lineTotal = (item.unitPrice + modTotal) * item.quantity;

  return (
    <div className={`flex gap-3 py-3 border-b border-gray-100 last:border-b-0 ${isUnavailable ? 'opacity-50' : ''}`}>
      {/* Image */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">{'\u{1F37D}\u{FE0F}'}</span>
        </div>
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
          <button
            onClick={() => removeItem(item.productId)}
            className="text-gray-400 hover:text-red-500 p-0.5 flex-shrink-0"
            aria-label="Remover item"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Unavailable warning */}
        {isUnavailable && (
          <p className="text-xs text-red-500 font-medium mt-0.5">
            Produto indisponivel - remova para continuar
          </p>
        )}

        {/* Modifiers */}
        {item.modifiers.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            {item.modifiers.map((m) => m.name).join(', ')}
          </p>
        )}

        {/* Notes */}
        {item.notes && (
          <p className="text-xs text-gray-400 mt-0.5 italic">
            {item.notes}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <QuantityControl
            quantity={item.quantity}
            onChange={(qty) => updateQuantity(item.productId, qty)}
            min={0}
          />
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Cart() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const totalAmount = useCartStore((s) => s.totalAmount());
  const clearCart = useCartStore((s) => s.clearCart);

  const unit = useSessionStore((s) => s.unit);
  const context = useSessionStore((s) => s.context);
  const createOrder = useCreateOrder(slug!);

  // Re-validate product availability
  const { data: productsData } = useProducts(slug!, {});
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!productsData?.categories) return;

    // Build a set of all available product IDs
    const availableIds = new Set<string>();
    for (const cat of productsData.categories) {
      for (const product of cat.products) {
        if (product.isAvailable) {
          availableIds.add(product.id);
        }
      }
    }

    // Check cart items against available products
    const unavailable = new Set<string>();
    for (const item of items) {
      if (!availableIds.has(item.productId)) {
        unavailable.add(item.productId);
      }
    }

    setUnavailableIds(unavailable);
  }, [productsData, items]);

  const hasUnavailableItems = unavailableIds.size > 0;

  const handlePlaceOrder = async () => {
    if (hasUnavailableItems) return;

    const orderItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      notes: item.notes || undefined,
      modifiers: item.modifiers.length > 0
        ? item.modifiers.map((m) => ({ modifierId: m.modifierId, quantity: m.quantity }))
        : undefined,
    }));

    try {
      const result = await createOrder.mutateAsync({ items: orderItems });
      clearCart();

      if (result.paymentRequired) {
        // PRE_PAYMENT: redirect to checkout
        navigate(`/${slug}/checkout`, {
          state: { orderId: result.orderId, total: result.total },
          replace: true,
        });
      } else {
        // POST_PAYMENT: redirect to order tracking
        navigate(`/${slug}/orders/${result.orderId}`, { replace: true });
      }
    } catch {
      // Error is shown via mutation state
    }
  };

  if (items.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState message="Sua sacola esta vazia" icon={'\u{1F6D2}'} />
        <div className="px-4 mt-4">
          <button
            onClick={() => navigate(`/${slug}/menu`)}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            Ver cardapio
          </button>
        </div>
      </div>
    );
  }

  // Determine order policy hint
  const policyHint = (() => {
    if (!unit) return null;
    if (unit.orderPolicy === 'PRE_PAYMENT') return 'Pagamento antes do preparo';
    if (unit.orderPolicy === 'POST_PAYMENT') return 'Pagamento na conta';
    if (unit.orderPolicy === 'HYBRID') {
      return context?.type === 'COUNTER'
        ? 'Pagamento antes do preparo'
        : 'Pagamento na conta';
    }
    return null;
  })();

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Sua sacola</h1>
        {context?.type === 'TABLE' && context.tableNumber && (
          <p className="text-sm text-gray-500 mt-0.5">
            Mesa {context.tableNumber}
          </p>
        )}
      </div>

      {/* Unavailable items warning */}
      {hasUnavailableItems && (
        <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            {unavailableIds.size === 1
              ? 'Um produto ficou indisponivel.'
              : `${unavailableIds.size} produtos ficaram indisponiveis.`}
            {' '}Remova para continuar.
          </p>
        </div>
      )}

      {/* Items */}
      <div className="px-4">
        {items.map((item, idx) => (
          <CartItemRow
            key={`${item.productId}-${idx}`}
            item={item}
            isUnavailable={unavailableIds.has(item.productId)}
          />
        ))}
      </div>

      {/* Add more items */}
      <div className="px-4 mt-3">
        <button
          onClick={() => navigate(`/${slug}/menu`)}
          className="w-full text-sm text-orange-600 font-medium py-2 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
        >
          + Adicionar mais itens
        </button>
      </div>

      {/* Order summary */}
      <div className="px-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
        {policyHint && (
          <p className="text-xs text-gray-400 mt-2">{policyHint}</p>
        )}
      </div>

      {/* Error */}
      {createOrder.isError && (
        <div className="px-4 mt-3">
          <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
            {createOrder.error instanceof Error
              ? createOrder.error.message
              : 'Erro ao criar pedido. Tente novamente.'}
          </p>
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={createOrder.isPending || hasUnavailableItems}
            className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {createOrder.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : hasUnavailableItems ? (
              'Remova itens indisponiveis'
            ) : (
              <>Fazer pedido {'\u2022'} {formatCurrency(totalAmount)}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
