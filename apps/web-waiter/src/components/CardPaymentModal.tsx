import { useState, useEffect } from 'react';
import { usePaymentStore } from '../stores/payment.store';

interface CardPaymentModalProps {
  remainingBalance: number;
  onClose: () => void;
}

export function CardPaymentModal({
  remainingBalance,
  onClose,
}: CardPaymentModalProps) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const { createCardPayment, pendingPayment, isLoading, stopPolling } =
    usePaymentStore();
  const [generated, setGenerated] = useState(false);

  const amountNum = parseFloat(amount) || 0;

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (generated && !pendingPayment) {
      onClose();
    }
  }, [generated, pendingPayment, onClose]);

  const handleGenerate = async () => {
    try {
      await createCardPayment(amountNum);
      setGenerated(true);
    } catch {
      // Error handled by store
    }
  };

  const handleCopyLink = () => {
    if (pendingPayment?.paymentUrl) {
      navigator.clipboard.writeText(pendingPayment.paymentUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Cartao (Link)</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        {!generated ? (
          <>
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
            <button
              onClick={handleGenerate}
              disabled={amountNum <= 0 || isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Gerando...' : 'Gerar Link de Pagamento'}
            </button>
          </>
        ) : pendingPayment ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-700">
              Envie este link para o cliente:
            </p>

            <div className="bg-gray-100 rounded-lg p-4 break-all text-sm font-mono text-blue-600">
              {pendingPayment.paymentUrl}
            </div>

            <button
              onClick={handleCopyLink}
              className="px-6 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300"
            >
              Copiar Link
            </button>

            <p className="text-sm text-gray-500">
              Aguardando pagamento...
            </p>

            <div className="animate-pulse">
              <div className="h-2 bg-blue-200 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
