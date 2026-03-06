import { useSessionStore } from '../stores/session.store';

export default function Closed() {
  const unit = useSessionStore((s) => s.unit);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <span className="text-6xl mb-4">🕐</span>
      <h1 className="text-xl font-bold text-gray-900">
        Estamos fechados
      </h1>
      {unit?.name && (
        <p className="text-base text-gray-600 mt-2">{unit.name}</p>
      )}
      <p className="text-sm text-gray-500 mt-4">
        No momento nao estamos aceitando pedidos.
      </p>

      {/* Operating hours */}
      {unit?.operatingHoursStart && unit?.operatingHoursEnd && (
        <div className="mt-6 bg-gray-50 rounded-xl px-6 py-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
            Horario de funcionamento
          </p>
          <p className="text-lg font-semibold text-gray-900">
            {unit.operatingHoursStart} - {unit.operatingHoursEnd}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-400 mt-8">
        Volte no nosso horario de funcionamento!
      </p>
    </div>
  );
}
