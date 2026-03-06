import { useState } from 'react';
import { useCashRegisterStore } from '../stores/cash-register.store';

interface CashOperationModalProps {
  onClose: () => void;
}

export function CashOperationModal({ onClose }: CashOperationModalProps) {
  const [type, setType] = useState<'WITHDRAWAL' | 'SUPPLY'>('WITHDRAWAL');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const { createOperation, isLoading } = useCashRegisterStore();

  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    await createOperation(type, amountNum, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {type === 'WITHDRAWAL' ? 'Sangria' : 'Suprimento'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setType('WITHDRAWAL')}
            className={`py-2 rounded-lg font-medium text-sm border ${
              type === 'WITHDRAWAL'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            Sangria
          </button>
          <button
            onClick={() => setType('SUPPLY')}
            className={`py-2 rounded-lg font-medium text-sm border ${
              type === 'SUPPLY'
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            Suprimento
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-600">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg text-lg font-bold text-right"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Sangria noturna - cofre"
            className="w-full mt-1 p-3 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={amountNum <= 0 || reason.length < 3 || isLoading}
          className={`w-full py-4 rounded-lg font-bold text-lg text-white disabled:opacity-50 ${
            type === 'WITHDRAWAL'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isLoading ? 'Registrando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
