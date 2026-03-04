interface PaymentMethodSelectorProps {
  remainingBalance: number;
  onSelectMethod: (method: 'cash' | 'pix' | 'card' | 'card-present') => void;
}

export function PaymentMethodSelector({
  remainingBalance,
  onSelectMethod,
}: PaymentMethodSelectorProps) {
  if (remainingBalance <= 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Forma de pagamento</p>
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onSelectMethod('cash')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <span className="text-2xl">R$</span>
          <span className="text-xs font-medium text-green-700">Dinheiro</span>
        </button>
        <button
          onClick={() => onSelectMethod('pix')}
          className="flex flex-col items-center gap-2 p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <span className="text-2xl">PIX</span>
          <span className="text-xs font-medium text-purple-700">QR Code</span>
        </button>
        <button
          onClick={() => onSelectMethod('card-present')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <span className="text-2xl">CC</span>
          <span className="text-xs font-medium text-blue-700">Cartao</span>
        </button>
      </div>
    </div>
  );
}
