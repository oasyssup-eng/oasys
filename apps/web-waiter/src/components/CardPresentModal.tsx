import { useState } from 'react';
import { usePaymentStore } from '../stores/payment.store';

interface CardPresentModalProps {
  remainingBalance: number;
  onClose: () => void;
}

export function CardPresentModal({
  remainingBalance,
  onClose,
}: CardPresentModalProps) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const [cardBrand, setCardBrand] = useState('');
  const [isDebit, setIsDebit] = useState(false);
  const { createCardPresentPayment, isLoading } = usePaymentStore();

  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    try {
      await createCardPresentPayment(
        amountNum,
        cardBrand || undefined,
        isDebit,
      );
      onClose();
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Cartao (Maquininha)</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Registre o pagamento ja processado na maquininha.
        </p>

        <div>
          <label className="text-sm text-gray-600">Valor</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg text-lg font-bold text-right"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Bandeira (opcional)</label>
          <select
            value={cardBrand}
            onChange={(e) => setCardBrand(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg"
          >
            <option value="">Selecionar</option>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="ELO">Elo</option>
            <option value="AMEX">Amex</option>
            <option value="HIPERCARD">Hipercard</option>
          </select>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDebit}
            onChange={(e) => setIsDebit(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Debito</span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={amountNum <= 0 || isLoading}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Registrando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
