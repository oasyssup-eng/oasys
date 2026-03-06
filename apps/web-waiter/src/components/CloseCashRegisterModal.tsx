import { useState } from 'react';
import { useCashRegisterStore } from '../stores/cash-register.store';

interface CloseCashRegisterModalProps {
  onClose: () => void;
}

export function CloseCashRegisterModal({
  onClose,
}: CloseCashRegisterModalProps) {
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const { closeRegister, isLoading } = useCashRegisterStore();

  const balanceNum = parseFloat(closingBalance) || 0;

  const handleSubmit = async () => {
    await closeRegister(balanceNum, closingNotes || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Fechar Caixa</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Conte o dinheiro no caixa e informe o valor total.
        </p>

        <div>
          <label className="text-sm text-gray-600">
            Valor contado (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={closingBalance}
            onChange={(e) => setClosingBalance(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 p-3 border rounded-lg text-lg font-bold text-right"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">
            Observacoes (opcional)
          </label>
          <textarea
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            placeholder="Notas sobre o fechamento..."
            rows={2}
            className="w-full mt-1 p-3 border rounded-lg text-sm resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={balanceNum < 0 || isLoading}
          className="w-full py-4 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 disabled:opacity-50"
        >
          {isLoading ? 'Fechando...' : 'Fechar Caixa'}
        </button>
      </div>
    </div>
  );
}
