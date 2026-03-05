import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductDetail } from '../hooks/useMenu';
import { useCartStore } from '../stores/cart.store';
import { ModifierSelector } from '../components/ModifierSelector';
import { QuantityControl } from '../components/QuantityControl';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/format';

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, error } = useProductDetail(slug!, id);
  const addItem = useCartStore((s) => s.addItem);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  // Map<modifierId, quantity>
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, number>>(new Map());

  const handleModifierChange = (modifierId: string, qty: number) => {
    setSelectedModifiers((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(modifierId);
      } else {
        next.set(modifierId, qty);
      }
      return next;
    });
  };

  // Calculate total with modifiers
  const itemTotal = useMemo(() => {
    if (!product) return 0;
    let modifiersTotal = 0;
    if (product.modifierGroups) {
      for (const group of product.modifierGroups) {
        for (const mod of group.modifiers) {
          const qty = selectedModifiers.get(mod.id) ?? 0;
          modifiersTotal += mod.price * qty;
        }
      }
    }
    return (product.effectivePrice + modifiersTotal) * quantity;
  }, [product, selectedModifiers, quantity]);

  // Check if all required modifier groups are satisfied
  const requiredGroupsSatisfied = useMemo(() => {
    if (!product?.modifierGroups) return true;
    return product.modifierGroups
      .filter((g) => g.required)
      .every((group) => {
        const total = group.modifiers.reduce(
          (sum, m) => sum + (selectedModifiers.get(m.id) ?? 0),
          0,
        );
        return total >= group.min;
      });
  }, [product, selectedModifiers]);

  const handleAddToCart = () => {
    if (!product) return;

    // Build modifier list from selected
    const modifiers: Array<{ modifierId: string; name: string; price: number; quantity: number }> = [];
    if (product.modifierGroups) {
      for (const group of product.modifierGroups) {
        for (const mod of group.modifiers) {
          const qty = selectedModifiers.get(mod.id) ?? 0;
          if (qty > 0) {
            modifiers.push({
              modifierId: mod.id,
              name: mod.name,
              price: mod.price,
              quantity: qty,
            });
          }
        }
      }
    }

    addItem({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.effectivePrice,
      modifiers,
      notes,
      imageUrl: product.imageUrl,
    });

    navigate(`/${slug}/menu`);
  };

  if (isLoading) return <LoadingSpinner />;

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">😕</span>
        <p className="text-gray-500 text-sm">Produto nao encontrado</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium"
        >
          Voltar
        </button>
      </div>
    );
  }

  const hasDiscount = product.effectivePrice < product.basePrice;

  return (
    <div className="pb-28">
      {/* Hero image */}
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-56 object-cover"
        />
      ) : (
        <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
          <span className="text-6xl">🍽️</span>
        </div>
      )}

      {/* Product info */}
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>

        {product.description && (
          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(product.effectivePrice)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {formatCurrency(product.basePrice)}
              </span>
              {product.priceLabel && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {product.priceLabel}
                </span>
              )}
            </>
          )}
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Modifier groups */}
      {product.modifierGroups && product.modifierGroups.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          {product.modifierGroups.map((group) => (
            <ModifierSelector
              key={group.id}
              group={group}
              selected={selectedModifiers}
              onChange={handleModifierChange}
            />
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="px-4 py-3 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Alguma observacao?
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: sem cebola, bem passado..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <QuantityControl quantity={quantity} onChange={setQuantity} />
          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable || !requiredGroupsSatisfied}
            className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Adicionar {formatCurrency(itemTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
