import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: Array<{
    modifierId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  notes: string;
  imageUrl: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      // Check if same product with same modifiers already exists
      const existingIdx = state.items.findIndex(
        (i) =>
          i.productId === item.productId &&
          JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers) &&
          i.notes === item.notes,
      );

      if (existingIdx >= 0) {
        const updated = [...state.items];
        const existing = updated[existingIdx]!;
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + item.quantity,
        };
        return { items: updated };
      }

      return { items: [...state.items, item] };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalAmount: () =>
    get().items.reduce((sum, i) => {
      const modTotal = i.modifiers.reduce(
        (ms, m) => ms + m.price * m.quantity,
        0,
      );
      return sum + (i.unitPrice + modTotal) * i.quantity;
    }, 0),
}));
