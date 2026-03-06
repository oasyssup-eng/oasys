interface StationProgressProps {
  completions: Record<string, boolean>;
}

const STATION_LABELS: Record<string, string> = {
  BAR: 'Bar',
  KITCHEN: 'Cozinha',
  GRILL: 'Grill',
  DESSERT: 'Sobre.',
};

export function StationProgress({ completions }: StationProgressProps) {
  const entries = Object.entries(completions);
  if (entries.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 text-xs border-t bg-gray-50">
      {entries.map(([station, done]) => (
        <span
          key={station}
          className={`px-2 py-0.5 rounded font-medium ${
            done
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {STATION_LABELS[station] ?? station} {done ? '\u2713' : '\u2026'}
        </span>
      ))}
    </div>
  );
}
