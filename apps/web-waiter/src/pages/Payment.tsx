import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePaymentStore } from '../stores/payment.store';
import { PaymentSummary } from '../components/PaymentSummary';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector';
import { PaymentHistory } from '../components/PaymentHistory';
import { CashPaymentModal } from '../components/CashPaymentModal';
import { PixPaymentModal } from '../components/PixPaymentModal';
import { CardPaymentModal } from '../components/CardPaymentModal';
import { CardPresentModal } from '../components/CardPresentModal';

type ModalType = 'cash' | 'pix' | 'card' | 'card-present' | null;

export function Payment() {
  const { checkId } = useParams<{ checkId: string }>();
  const { summary, isLoading, error, loadSummary, clearError } =
    usePaymentStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    if (checkId) {
      loadSummary(checkId);
    }
  }, [checkId, loadSummary]);

  if (!checkId) {
    return (
      <div className="p-4 text-center text-gray-500">
        Selecione uma conta para registrar pagamento.
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pagamento</h1>
        {summary && (
          <span className="text-sm text-gray-500">
            Conta #{checkId.slice(-6)}
          </span>
        )}
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm cursor-pointer"
          onClick={clearError}
        >
          {error}
        </div>
      )}

      {isLoading && !summary ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : summary ? (
        <>
          <PaymentSummary summary={summary} />

          {!summary.isPaid && (
            <PaymentMethodSelector
              remainingBalance={summary.remainingBalance}
              onSelectMethod={(method) => setActiveModal(method)}
            />
          )}

          {summary.isPaid && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-bold text-lg">
                Conta paga!
              </p>
            </div>
          )}

          <PaymentHistory payments={summary.payments} />
        </>
      ) : null}

      {activeModal === 'cash' && summary && (
        <CashPaymentModal
          remainingBalance={summary.remainingBalance}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'pix' && summary && (
        <PixPaymentModal
          remainingBalance={summary.remainingBalance}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'card' && summary && (
        <CardPaymentModal
          remainingBalance={summary.remainingBalance}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'card-present' && summary && (
        <CardPresentModal
          remainingBalance={summary.remainingBalance}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
