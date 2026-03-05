import type { PaymentDTO } from '@oasys/shared';

interface PaymentHistoryProps {
  payments: PaymentDTO[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Credito',
  DEBIT_CARD: 'Debito',
  PIX: 'PIX',
  VOUCHER: 'Voucher',
};

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
};

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700">
        Pagamentos realizados
      </h2>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[payment.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {payment.status === 'CONFIRMED' ? 'OK' : payment.status}
            </span>
            <span className="text-sm font-medium">
              {METHOD_LABELS[payment.method] ?? payment.method}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold">
              R$ {Number(payment.amount).toFixed(2)}
            </span>
            {payment.paidAt && (
              <p className="text-xs text-gray-400">
                {new Date(payment.paidAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
