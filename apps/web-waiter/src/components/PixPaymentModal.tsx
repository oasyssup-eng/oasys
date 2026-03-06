import { useState, useEffect } from 'react';
import { usePaymentStore } from '../stores/payment.store';

interface PixPaymentModalProps {
  remainingBalance: number;
  onClose: () => void;
}

export function PixPaymentModal({
  remainingBalance,
  onClose,
}: PixPaymentModalProps) {
  const [amount, setAmount] = useState(remainingBalance.toFixed(2));
  const { createPixPayment, pendingPayment, isLoading, stopPolling } =
    usePaymentStore();
  const [generated, setGenerated] = useState(false);

  const amountNum = parseFloat(amount) || 0;

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Auto-close when payment confirmed (pendingPayment becomes null)
  useEffect(() => {
    if (generated && !pendingPayment) {
      onClose();
    }
  }, [generated, pendingPayment, onClose]);

  const handleGenerate = async () => {
    try {
      await createPixPayment(amountNum);
      setGenerated(true);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">PIX</h2>
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
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Gerando...' : 'Gerar QR Code PIX'}
            </button>
          </>
        ) : pendingPayment ? (
          <div className="text-center space-y-4">
            <div className="bg-gray-100 rounded-lg p-6">
              {pendingPayment.pixQrCodeBase64 ? (
                <img
                  src={pendingPayment.pixQrCodeBase64}
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48"
                />
              ) : (
                <div className="text-sm text-gray-500 break-all font-mono">
                  {pendingPayment.pixQrCode}
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500">
              Aguardando pagamento...
            </p>

            {pendingPayment.expiresAt && (
              <p className="text-xs text-gray-400">
                Expira em{' '}
                {new Date(pendingPayment.expiresAt).toLocaleTimeString(
                  'pt-BR',
                  { hour: '2-digit', minute: '2-digit' },
                )}
              </p>
            )}

            <div className="animate-pulse">
              <div className="h-2 bg-purple-200 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
