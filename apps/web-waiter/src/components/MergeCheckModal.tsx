import { useState } from 'react';
import { useCheckStore } from '../stores/check.store';

interface MergeCheckModalProps {
  targetCheckId: string;
  onClose: () => void;
}

export function MergeCheckModal({
  targetCheckId,
  onClose,
}: MergeCheckModalProps) {
  const [sourceIds, setSourceIds] = useState('');
  const { mergeChecks, isLoading } = useCheckStore();

  const handleSubmit = async () => {
    const ids = sourceIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;

    try {
      await mergeChecks(targetCheckId, ids);
      onClose();
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Juntar Contas</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Informe os IDs das contas a serem incorporadas nesta conta.
        </p>

        <div>
          <label className="text-sm text-gray-600">
            IDs das contas (separados por virgula)
          </label>
          <input
            type="text"
            value={sourceIds}
            onChange={(e) => setSourceIds(e.target.value)}
            placeholder="check_abc123, check_def456"
            className="w-full mt-1 p-3 border rounded-lg text-sm"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !sourceIds.trim()}
          className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? 'Juntando...' : 'Confirmar Merge'}
        </button>
      </div>
    </div>
  );
}
