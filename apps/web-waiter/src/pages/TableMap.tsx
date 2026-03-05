import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableStatus, type TableColor, type TableStatus } from '../hooks/useTableStatus';
import { useWaiterSocket } from '../hooks/useWaiterSocket';

const COLOR_MAP: Record<TableColor, { bg: string; border: string; text: string }> = {
  GREEN: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  RED: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
  YELLOW: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  STAR: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
  GRAY: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400' },
};

export function TableMap() {
  const { data: tables, isLoading, invalidate } = useTableStatus();
  const navigate = useNavigate();
  const [activeZone, setActiveZone] = useState<string | null>(null);

  useWaiterSocket(invalidate);

  const zones = useMemo(() => {
    if (!tables) return [];
    const zoneMap = new Map<string, string>();
    for (const t of tables) {
      zoneMap.set(t.zone.id, t.zone.name);
    }
    return Array.from(zoneMap, ([id, name]) => ({ id, name }));
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (!tables) return [];
    if (!activeZone) return tables;
    return tables.filter((t) => t.zone.id === activeZone);
  }, [tables, activeZone]);

  const handleTableClick = (table: TableStatus) => {
    if (table.color === 'GRAY') return;
    navigate(`/tables/${table.id}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-400">Carregando mesas...</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Zone tabs */}
      {zones.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveZone(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeZone === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setActiveZone(zone.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeZone === zone.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-400" /> Livre
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-400" /> Ocupada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-400" /> Pronto
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-400" /> Chamando
        </span>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {filteredTables.map((table) => {
          const colors = COLOR_MAP[table.color];
          return (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              disabled={table.color === 'GRAY'}
              className={`relative p-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${colors.text} transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {table.color === 'STAR' && (
                <span className="absolute -top-1 -right-1 text-lg">*</span>
              )}
              <div className="text-2xl font-bold">{table.number}</div>
              <div className="text-xs mt-1">
                {table.label ?? `Mesa ${table.number}`}
              </div>
              {table.orderCount > 0 && (
                <div className="text-xs mt-0.5 opacity-75">
                  {table.orderCount} pedido{table.orderCount > 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          Nenhuma mesa encontrada
        </div>
      )}
    </div>
  );
}
