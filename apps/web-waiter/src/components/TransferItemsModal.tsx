import { useState } from 'react';
import { useCheckStore } from '../stores/check.store';

interface Item {
  id: string;
  quantity: number;
  totalPrice: number;
  product: { name: string };
}

interface TransferItemsModalProps {
  checkId: string;
  items: Item[];
  onClose: () => void;
}

export function TransferItemsModal({
  checkId,
  items,
  onClose,
}: TransferItemsModalProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [targetCheckId, setTargetCheckId] = useState('');
  const { transferItems, isLoading } = useCheckStore();

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0 || !targetCheckId.trim()) return;
    try {
      await transferItems(checkId, targetCheckId.trim(), selectedItems);
      onClose();
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Transferir Itens</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Conta destino (ID)
          </label>
          <input
            type="text"
            value={targetCheckId}
            onChange={(e) => setTargetCheckId(e.target.value)}
            placeholder="check_abc123"
            className="w-full mt-1 p-3 border rounded-lg text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">Selecione os itens</label>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex justify-between p-3 rounded-lg text-sm ${
                selectedItems.includes(item.id)
                  ? 'bg-orange-50 border-2 border-orange-300 text-orange-700'
                  : 'bg-gray-50 border border-gray-200 text-gray-600'
              }`}
            >
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>R$ {item.totalPrice.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedItems.length === 0 || !targetCheckId.trim()}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50"
        >
          {isLoading ? 'Transferindo...' : `Transferir ${selectedItems.length} ite${selectedItems.length === 1 ? 'm' : 'ns'}`}
        </button>
      </div>
    </div>
  );
}
