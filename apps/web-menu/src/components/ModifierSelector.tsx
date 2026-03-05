import type { MenuModifierGroupDTO } from '@oasys/shared';
import { formatCurrency } from '../lib/format';

interface ModifierSelectorProps {
  group: MenuModifierGroupDTO;
  selected: Map<string, number>;
  onChange: (modifierId: string, quantity: number) => void;
}

export function ModifierSelector({ group, selected, onChange }: ModifierSelectorProps) {
  const isRadio = group.min === 1 && group.max === 1;
  const totalSelected = Array.from(selected.values()).reduce((sum, q) => sum + q, 0);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm">{group.name}</h3>
        {group.required ? (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            Obrigatorio
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            Ate {group.max} opcao(oes)
          </span>
        )}
      </div>

      <div className="space-y-2">
        {group.modifiers.map((mod) => {
          const isSelected = (selected.get(mod.id) ?? 0) > 0;
          const isDisabled = !mod.isAvailable || (!isSelected && totalSelected >= group.max);

          return (
            <label
              key={mod.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-orange-500 bg-orange-50'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type={isRadio ? 'radio' : 'checkbox'}
                name={group.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => {
                  if (isRadio) {
                    // Clear others in group, set this one
                    group.modifiers.forEach((m) => {
                      if (m.id !== mod.id) onChange(m.id, 0);
                    });
                    onChange(mod.id, 1);
                  } else {
                    onChange(mod.id, isSelected ? 0 : 1);
                  }
                }}
                className="sr-only"
              />

              {/* Visual indicator */}
              <div
                className={`w-5 h-5 rounded-${isRadio ? 'full' : 'md'} border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                }`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>

              <span className="flex-1 text-sm text-gray-700">{mod.name}</span>
              {mod.price > 0 && (
                <span className="text-sm text-gray-500">
                  +{formatCurrency(mod.price)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
