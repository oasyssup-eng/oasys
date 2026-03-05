interface PaymentMethodButtonProps {
  method: 'PIX' | 'CARD';
  onClick: () => void;
  disabled?: boolean;
}

const config = {
  PIX: {
    label: 'PIX',
    icon: '📱',
    description: 'QR Code instantaneo',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
  },
  CARD: {
    label: 'Cartao',
    icon: '💳',
    description: 'Link de pagamento',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
};

export function PaymentMethodButton({ method, onClick, disabled }: PaymentMethodButtonProps) {
  const { label, icon, description, color } = config[method];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${color} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="text-left">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </button>
  );
}
