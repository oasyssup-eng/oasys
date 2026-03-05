import { useKDSStore } from '../stores/kds.store';

const STATIONS = [
  { id: 'ALL' as const, label: 'Tudo' },
  { id: 'BAR' as const, label: 'Bar' },
  { id: 'KITCHEN' as const, label: 'Cozinha' },
  { id: 'GRILL' as const, label: 'Grill' },
  { id: 'DESSERT' as const, label: 'Sobremesa' },
];

export function StationSelector() {
  const { station, setStation } = useKDSStore();

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {STATIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => setStation(s.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            station === s.id
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
