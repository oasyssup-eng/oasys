import { useState } from 'react';
import { useCheckStore } from '../stores/check.store';

type SplitMode = 'equal' | 'by-items' | 'custom';

interface Item {
  id: string;
  quantity: number;
  totalPrice: number;
  product: { name: string };
}

interface SplitCheckModalProps {
  checkId: string;
  items: Item[];
  remainingBalance: number;
  onClose: () => void;
}

export function SplitCheckModal({
  checkId,
  items,
  remainingBalance,
  onClose,
}: SplitCheckModalProps) {
  const [mode, setMode] = useState<SplitMode>('equal');
  const { splitEqual, splitByItems, splitCustom, isLoading } = useCheckStore();

  // Equal split state
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const perPerson = remainingBalance / numberOfPeople;

  // By items state
  const [assignments, setAssignments] = useState<
    Array<{ label: string; itemIds: string[] }>
  >([
    { label: 'Pessoa 1', itemIds: [] },
    { label: 'Pessoa 2', itemIds: [] },
  ]);

  // Custom state
  const [customAmounts, setCustomAmounts] = useState<
    Array<{ label: string; amount: string }>
  >([
    { label: 'Pessoa 1', amount: '' },
    { label: 'Pessoa 2', amount: '' },
  ]);

  const handleSplitEqual = async () => {
    try {
      await splitEqual(checkId, numberOfPeople, true);
      onClose();
    } catch {
      // Error handled by store
    }
  };

  const handleSplitByItems = async () => {
    try {
      await splitByItems(checkId, assignments.filter((a) => a.itemIds.length > 0));
      onClose();
    } catch {
      // Error handled by store
    }
  };

  const handleSplitCustom = async () => {
    try {
      const amounts = customAmounts
        .filter((a) => parseFloat(a.amount) > 0)
        .map((a) => ({ label: a.label, amount: parseFloat(a.amount) }));
      await splitCustom(checkId, amounts);
      onClose();
    } catch {
      // Error handled by store
    }
  };

  const toggleItemAssignment = (personIndex: number, itemId: string) => {
    setAssignments((prev) =>
      prev.map((a, i) => {
        if (i !== personIndex) return a;
        const has = a.itemIds.includes(itemId);
        return {
          ...a,
          itemIds: has
            ? a.itemIds.filter((id) => id !== itemId)
            : [...a.itemIds, itemId],
        };
      }),
    );
  };

  const addPerson = () => {
    if (mode === 'by-items') {
      setAssignments((prev) => [
        ...prev,
        { label: `Pessoa ${prev.length + 1}`, itemIds: [] },
      ]);
    } else if (mode === 'custom') {
      setCustomAmounts((prev) => [
        ...prev,
        { label: `Pessoa ${prev.length + 1}`, amount: '' },
      ]);
    }
  };

  const customTotal = customAmounts.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Dividir Conta</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Total: R$ {remainingBalance.toFixed(2)}
        </p>

        {/* Mode tabs */}
        <div className="flex gap-2">
          {(['equal', 'by-items', 'custom'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                mode === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {m === 'equal' ? 'Igual' : m === 'by-items' ? 'Por Itens' : 'Personalizado'}
            </button>
          ))}
        </div>

        {/* Equal mode */}
        {mode === 'equal' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Numero de pessoas</label>
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => setNumberOfPeople((n) => Math.max(2, n - 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg"
                >
                  -
                </button>
                <span className="text-3xl font-bold text-gray-900 w-12 text-center">
                  {numberOfPeople}
                </span>
                <button
                  onClick={() => setNumberOfPeople((n) => Math.min(20, n + 1))}
                  className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <span className="text-sm text-blue-600">Cada pessoa paga: </span>
              <span className="text-lg font-bold text-blue-700">
                R$ {perPerson.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleSplitEqual}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Dividindo...' : 'Confirmar Divisao'}
            </button>
          </div>
        )}

        {/* By items mode */}
        {mode === 'by-items' && (
          <div className="space-y-4">
            {assignments.map((person, personIdx) => (
              <div key={personIdx} className="space-y-2">
                <span className="text-sm font-semibold text-gray-700">
                  {person.label}
                </span>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleItemAssignment(personIdx, item.id)}
                      className={`w-full flex justify-between p-2 rounded-lg text-sm ${
                        person.itemIds.includes(item.id)
                          ? 'bg-blue-50 border border-blue-200 text-blue-700'
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
              </div>
            ))}
            <button
              onClick={addPerson}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm"
            >
              + Adicionar pessoa
            </button>
            <button
              onClick={handleSplitByItems}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Dividindo...' : 'Confirmar Divisao'}
            </button>
          </div>
        )}

        {/* Custom mode */}
        {mode === 'custom' && (
          <div className="space-y-4">
            {customAmounts.map((person, idx) => (
              <div key={idx}>
                <label className="text-sm text-gray-600">{person.label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={person.amount}
                  onChange={(e) =>
                    setCustomAmounts((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, amount: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="0.00"
                  className="w-full mt-1 p-3 border rounded-lg text-right"
                />
              </div>
            ))}
            <button
              onClick={addPerson}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 text-sm"
            >
              + Adicionar pessoa
            </button>
            <div
              className={`text-sm text-center ${
                Math.abs(customTotal - remainingBalance) < 0.01
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              Total informado: R$ {customTotal.toFixed(2)} / R${' '}
              {remainingBalance.toFixed(2)}
            </div>
            <button
              onClick={handleSplitCustom}
              disabled={isLoading || customTotal <= 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Dividindo...' : 'Confirmar Divisao'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
