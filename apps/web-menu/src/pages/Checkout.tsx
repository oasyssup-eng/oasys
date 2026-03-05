import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useInitiatePayment } from '../hooks/useOrders';
import { PaymentMethodButton } from '../components/PaymentMethodButton';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../lib/format';

interface LocationState {
  orderId: string;
  total: number;
}

interface PaymentResult {
  qrCodeBase64?: string;
  qrCodePayload?: string;
  expiresAt?: string;
  paymentUrl?: string;
  paymentId?: string;
}

export default function Checkout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CARD' | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [polling, setPolling] = useState(false);

  const initiatePayment = useInitiatePayment(slug!);

  if (!state?.orderId) {
    navigate(`/${slug}/menu`, { replace: true });
    return null;
  }

  const handleSelectMethod = async (method: 'PIX' | 'CARD') => {
    setSelectedMethod(method);
    try {
      const result = await initiatePayment.mutateAsync({
        orderId: state.orderId,
        method,
      }) as PaymentResult;

      setPaymentResult(result);

      if (method === 'PIX') {
        // Start polling for PIX payment confirmation
        setPolling(true);
        pollPaymentStatus();
      } else if (method === 'CARD' && result.paymentUrl) {
        // Open card payment link
        window.open(result.paymentUrl, '_blank');
        setPolling(true);
        pollPaymentStatus();
      }
    } catch {
      // Error shown via mutation state
    }
  };

  const pollPaymentStatus = () => {
    // Poll order status — when payment is confirmed, status changes from HELD
    const interval = setInterval(async () => {
      try {
        const { api } = await import('../lib/api');
        const order = await api.get<{ status: string }>(
          `/menu/${slug}/orders/${state!.orderId}`,
        );
        if (order.status !== 'HELD') {
          clearInterval(interval);
          setPolling(false);
          navigate(`/${slug}/orders/${state!.orderId}`, { replace: true });
        }
      } catch {
        // Keep polling
      }
    }, 3000);

    // Stop after 10 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPolling(false);
    }, 600_000);
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Pagamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Total: <span className="font-semibold text-gray-900">{formatCurrency(state.total)}</span>
        </p>
      </div>

      {/* Payment method selection or result */}
      {!paymentResult ? (
        <div className="px-4 mt-4 space-y-3">
          <p className="text-sm text-gray-600 font-medium">Escolha a forma de pagamento:</p>
          <PaymentMethodButton
            method="PIX"
            onClick={() => handleSelectMethod('PIX')}
            disabled={initiatePayment.isPending}
          />
          <PaymentMethodButton
            method="CARD"
            onClick={() => handleSelectMethod('CARD')}
            disabled={initiatePayment.isPending}
          />

          {initiatePayment.isPending && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
              <span className="text-sm text-gray-500">Gerando pagamento...</span>
            </div>
          )}

          {initiatePayment.isError && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
              {initiatePayment.error instanceof Error
                ? initiatePayment.error.message
                : 'Erro ao gerar pagamento. Tente novamente.'}
            </p>
          )}
        </div>
      ) : selectedMethod === 'PIX' && paymentResult.qrCodeBase64 ? (
        <div className="px-4 mt-4">
          <QRCodeDisplay
            qrCodeBase64={paymentResult.qrCodeBase64}
            qrCodePayload={paymentResult.qrCodePayload ?? ''}
            expiresAt={paymentResult.expiresAt ?? ''}
          />
          {polling && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
              <span className="text-sm text-gray-500">Aguardando pagamento...</span>
            </div>
          )}
        </div>
      ) : selectedMethod === 'CARD' ? (
        <div className="px-4 mt-4">
          <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-xl">
            <span className="text-4xl">💳</span>
            <p className="text-sm text-gray-700 text-center">
              Um link de pagamento foi aberto em uma nova aba.
            </p>
            {paymentResult.paymentUrl && (
              <a
                href={paymentResult.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline"
              >
                Abrir link novamente
              </a>
            )}
            {polling && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                <span className="text-sm text-gray-500">Aguardando confirmacao...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <LoadingSpinner />
      )}

      {/* Back to menu */}
      {!polling && paymentResult && (
        <div className="px-4 mt-6">
          <button
            onClick={() => navigate(`/${slug}/orders/${state.orderId}`)}
            className="w-full py-3 border border-gray-300 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Ver status do pedido
          </button>
        </div>
      )}
    </div>
  );
}
