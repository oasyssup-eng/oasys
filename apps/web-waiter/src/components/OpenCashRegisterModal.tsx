import { useState } from 'react';
import { useCashRegisterStore } from '../stores/cash-register.store';

interface OpenCashRegisterModalProps {
  onClose: () => void;
}

export function OpenCashRegisterModal({ onClose }: OpenCashRegisterModalProps) {
  const [openingBalance, setOpeningBalance] = useState('200');
  const { openRegister, isLoading } = useCashRegisterStore();

  const balanceNum = parseFloat(openingBalance) || 0;

  const handleSubmit = async () => {
    await openRegister(balanceNum);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Abrir Caixa</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Fundo de troco (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg text-lg font-bold text-right"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={balanceNum < 0 || isLoading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Abrindo...' : 'Abrir Caixa'}
        </button>
      </div>
    </div>
  );
}
