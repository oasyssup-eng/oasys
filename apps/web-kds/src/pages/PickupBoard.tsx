import { useParams } from 'react-router-dom';
import { usePickupBoard } from '../hooks/usePickupBoard';
import { PickupCard } from '../components/PickupCard';

export function PickupBoard() {
  const { slug = '' } = useParams();
  const { data, error } = usePickupBoard(slug);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-xl">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white">{data.unitName}</h1>
        <p className="text-gray-400 mt-1">Painel de Retirada</p>
      </header>

      {data.ready.length > 0 && (
        <section className="mb-8">
          <h2 className="text-green-400 text-xl font-bold mb-4 uppercase tracking-wider">
            Pronto para Retirada
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.ready.map((order) => (
              <PickupCard
                key={order.orderNumber}
                orderNumber={order.orderNumber}
                items={order.items}
                readyAt={order.readyAt}
                elapsedSinceReady={order.elapsedSinceReady}
              />
            ))}
          </div>
        </section>
      )}

      {data.preparing.length > 0 && (
        <section>
          <h2 className="text-yellow-400 text-xl font-bold mb-4 uppercase tracking-wider">
            Preparando
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {data.preparing.map((order) => (
              <div
                key={order.orderNumber}
                className="bg-gray-800 rounded-xl p-4 min-w-[120px] text-center flex-shrink-0"
              >
                <div className="text-3xl font-bold text-yellow-300">
                  #{order.orderNumber}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ~{order.estimatedMinutes} min
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.ready.length === 0 && data.preparing.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <p className="text-2xl">Nenhum pedido no momento</p>
        </div>
      )}
    </div>
  );
}
