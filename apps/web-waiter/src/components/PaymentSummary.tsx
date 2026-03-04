import type { PaymentSummaryDTO } from '@oasys/shared';

interface PaymentSummaryProps {
  summary: PaymentSummaryDTO;
}

export function PaymentSummary({ summary }: PaymentSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Total da conta</span>
        <span>R$ {summary.checkTotal.toFixed(2)}</span>
      </div>
      {summary.serviceFeeAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Taxa de servico (10%)</span>
          <span>R$ {summary.serviceFeeAmount.toFixed(2)}</span>
        </div>
      )}
      <div className="border-t pt-2 flex justify-between font-bold">
        <span>TOTAL</span>
        <span>R$ {summary.grossTotal.toFixed(2)}</span>
      </div>
      {summary.totalPaid > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Ja pago</span>
          <span>R$ {summary.totalPaid.toFixed(2)}</span>
        </div>
      )}
      <div className="border-t pt-2 flex justify-between font-bold text-lg">
        <span>RESTANTE</span>
        <span
          className={
            summary.remainingBalance <= 0 ? 'text-green-600' : 'text-red-600'
          }
        >
          R$ {summary.remainingBalance.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
