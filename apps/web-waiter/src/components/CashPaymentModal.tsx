import { useState } from 'react';
import { usePaymentStore } from '../stores/payment.store';

interface CashPaymentModalProps {
  remainingBalance: number;
  onClose: () => void;
}

export function CashPaymentModal({
  remainingBalance,
  onClose,
}: CashPaymentModalProps) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const [receivedAmount, setReceivedAmount] = useState('');
  const { createCashPayment, isLoading } = usePaymentStore();

  const amountNum = parseFloat(amount) || 0;
  const receivedNum = parseFloat(receivedAmount) || 0;
  const change = receivedNum > 0 ? receivedNum - amountNum : 0;

  const handleSubmit = async () => {
    try {
      await createCashPayment(
        amountNum,
        receivedNum > 0 ? receivedNum : undefined,
      );
      onClose();
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Dinheiro</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-600">Valor a pagar</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg text-lg font-bold text-right"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Valor recebido</label>
          <input
            type="number"
            step="0.01"
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value)}
            placeholder={amountNum.toFixed(2)}
            className="w-full mt-1 p-3 border rounded-lg text-lg text-right"
          />
        </div>

        {change > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <span className="text-sm text-yellow-700">Troco: </span>
            <span className="text-lg font-bold text-yellow-700">
              R$ {change.toFixed(2)}
            </span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={amountNum <= 0 || isLoading}
          className="w-full py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Registrando...' : 'Confirmar Pagamento'}
        </button>
      </div>
    </div>
  );
}
