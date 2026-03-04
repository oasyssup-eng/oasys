import { useEffect, useState } from 'react';
import { useCashRegisterStore } from '../stores/cash-register.store';
import { OpenCashRegisterModal } from '../components/OpenCashRegisterModal';
import { CashOperationModal } from '../components/CashOperationModal';
import { CloseCashRegisterModal } from '../components/CloseCashRegisterModal';

type ModalType = 'open' | 'operation' | 'close' | null;

export function CashRegister() {
  const { activeRegister, isLoading, error, loadActive, clearError } =
    useCashRegisterStore();
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Caixa</h1>

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm cursor-pointer"
          onClick={clearError}
        >
          {error}
        </div>
      )}

      {isLoading && !activeRegister ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : activeRegister ? (
        <>
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aberto
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Tipo</span>
              <span className="text-sm font-medium">
                {activeRegister.type === 'DIGITAL' ? 'Digital' : 'Operador'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Fundo</span>
              <span className="text-sm font-medium">
                R$ {Number(activeRegister.openingBalance).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Aberto em</span>
              <span className="text-sm font-medium">
                {new Date(activeRegister.openedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveModal('operation')}
              className="py-3 px-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 font-medium text-sm hover:bg-yellow-100"
            >
              Sangria / Suprimento
            </button>
            <button
              onClick={() => setActiveModal('close')}
              className="py-3 px-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium text-sm hover:bg-red-100"
            >
              Fechar Caixa
            </button>
          </div>

          {activeRegister.operations.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Operacoes
              </h2>
              {activeRegister.operations.map((op) => (
                <div
                  key={op.id}
                  className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between"
                >
                  <div>
                    <span
                      className={`text-xs font-medium ${
                        op.type === 'WITHDRAWAL'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {op.type === 'WITHDRAWAL'
                        ? 'Sangria'
                        : op.type === 'SUPPLY'
                          ? 'Suprimento'
                          : 'Ajuste'}
                    </span>
                    <p className="text-xs text-gray-500">{op.reason}</p>
                  </div>
                  <span className="text-sm font-medium">
                    R$ {Number(op.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Nenhum caixa aberto</p>
          <button
            onClick={() => setActiveModal('open')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Abrir Caixa
          </button>
        </div>
      )}

      {activeModal === 'open' && (
        <OpenCashRegisterModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'operation' && (
        <CashOperationModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'close' && (
        <CloseCashRegisterModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
