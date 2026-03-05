import { useState } from 'react';
import { useCheckStore } from '../stores/check.store';

interface ServiceFeeToggleProps {
  checkId: string;
  currentFee: number;
}

export function ServiceFeeToggle({
  checkId,
  currentFee,
}: ServiceFeeToggleProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(currentFee.toFixed(2));
  const { updateServiceFee, isLoading } = useCheckStore();

  const handleToggle = async () => {
    if (currentFee > 0) {
      // Remove service fee
      await updateServiceFee(checkId, 0);
    } else {
      setEditing(true);
    }
  };

  const handleSave = async () => {
    const num = parseFloat(amount) || 0;
    await updateServiceFee(checkId, num);
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">
            Taxa de Servico
          </span>
          {currentFee > 0 && (
            <span className="text-sm text-gray-500 ml-2">
              R$ {currentFee.toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`text-sm px-3 py-1 rounded-lg font-medium ${
            currentFee > 0
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {currentFee > 0 ? 'Remover' : 'Adicionar'}
        </button>
      </div>

      {editing && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 p-2 border rounded-lg text-sm text-right"
          />
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
          >
            Salvar
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
