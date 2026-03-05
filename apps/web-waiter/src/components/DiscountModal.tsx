import { useState } from 'react';
import { useCheckStore } from '../stores/check.store';

interface DiscountModalProps {
  checkId: string;
  grossTotal: number;
  onClose: () => void;
}

export function DiscountModal({
  checkId,
  grossTotal,
  onClose,
}: DiscountModalProps) {
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const { applyDiscount, isLoading } = useCheckStore();

  const numValue = parseFloat(value) || 0;
  const discountAmount =
    type === 'PERCENTAGE' ? (grossTotal * numValue) / 100 : numValue;
  const needsAuth = type === 'PERCENTAGE' && numValue > 15;

  const handleSubmit = async () => {
    if (numValue <= 0 || !reason.trim()) return;
    try {
      await applyDiscount(
        checkId,
        type,
        numValue,
        reason.trim(),
        needsAuth ? authorizedBy.trim() || undefined : undefined,
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
          <h2 className="text-lg font-bold">Aplicar Desconto</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Total: R$ {grossTotal.toFixed(2)}
        </p>

        {/* Type selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setType('PERCENTAGE')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              type === 'PERCENTAGE'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Porcentagem (%)
          </button>
          <button
            onClick={() => setType('FIXED')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              type === 'FIXED'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Valor Fixo (R$)
          </button>
        </div>

        <div>
          <label className="text-sm text-gray-600">
            {type === 'PERCENTAGE' ? 'Porcentagem' : 'Valor'}
          </label>
          <input
            type="number"
            step={type === 'PERCENTAGE' ? '1' : '0.01'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'PERCENTAGE' ? '10' : '15.00'}
            className="w-full mt-1 p-3 border rounded-lg text-lg text-right"
          />
        </div>

        {discountAmount > 0 && (
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <span className="text-sm text-yellow-700">Desconto: </span>
            <span className="text-lg font-bold text-yellow-700">
              R$ {discountAmount.toFixed(2)}
            </span>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-600">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Cliente fiel, erro no pedido..."
            className="w-full mt-1 p-3 border rounded-lg text-sm"
          />
        </div>

        {needsAuth && (
          <div>
            <label className="text-sm text-red-600 font-medium">
              Desconto acima de 15% — PIN do gerente
            </label>
            <input
              type="text"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              placeholder="ID do gerente"
              className="w-full mt-1 p-3 border border-red-200 rounded-lg text-sm"
            />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading || numValue <= 0 || !reason.trim() || (needsAuth && !authorizedBy.trim())}
          className="w-full py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 disabled:opacity-50"
        >
          {isLoading ? 'Aplicando...' : 'Aplicar Desconto'}
        </button>
      </div>
    </div>
  );
}
