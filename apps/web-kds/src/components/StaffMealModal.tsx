import { useState } from 'react';
import { useKDSStore } from '../stores/kds.store';

interface StaffMealModalProps {
  orderId: string;
  onClose: () => void;
}

export function StaffMealModal({ orderId, onClose }: StaffMealModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const markStaffMeal = useKDSStore((s) => s.markStaffMeal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;

    setLoading(true);
    try {
      await markStaffMeal(orderId, employeeId.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Consumo Interno</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              ID do Funcionario
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="ID do funcionario"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!employeeId.trim() || loading}
              className="flex-1 py-2 rounded-lg bg-gray-700 text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? '...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
