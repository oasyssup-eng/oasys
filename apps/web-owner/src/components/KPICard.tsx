interface KPICardProps {
  label: string;
  value: string;
  change?: number | null;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'gray';
}

const COLOR_MAP = {
  green: 'bg-green-50 border-green-200',
  blue: 'bg-blue-50 border-blue-200',
  yellow: 'bg-yellow-50 border-yellow-200',
  red: 'bg-red-50 border-red-200',
  gray: 'bg-gray-50 border-gray-200',
};

export function KPICard({ label, value, change, color = 'gray' }: KPICardProps) {
  return (
    <div className={`rounded-lg border p-4 ${COLOR_MAP[color]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {change != null && (
        <p
          className={`mt-1 text-sm font-medium ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}% vs semana anterior
        </p>
      )}
    </div>
  );
}
