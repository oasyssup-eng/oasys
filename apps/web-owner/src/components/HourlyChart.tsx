import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HourlyData {
  hour: number;
  revenue: number;
  orderCount: number;
  checkCount: number;
}

interface HourlyChartProps {
  current: HourlyData[];
  previous?: HourlyData[];
}

export function HourlyChart({ current, previous }: HourlyChartProps) {
  // Merge current and previous data for overlay
  const allHours = new Set([
    ...current.map((h) => h.hour),
    ...(previous ?? []).map((h) => h.hour),
  ]);

  const data = Array.from(allHours)
    .sort((a, b) => a - b)
    .map((hour) => {
      const curr = current.find((h) => h.hour === hour);
      const prev = previous?.find((h) => h.hour === hour);
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        atual: curr?.revenue ?? 0,
        anterior: prev?.revenue ?? 0,
      };
    });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Sem dados de faturamento por hora
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v: number) => `R$${v}`} />
        <Tooltip
          formatter={(value, name) => [
            `R$ ${Number(value ?? 0).toFixed(2)}`,
            name === 'atual' ? 'Atual' : 'Semana Anterior',
          ]}
        />
        <Legend formatter={(value: string) => (value === 'atual' ? 'Atual' : 'Semana Anterior')} />
        <Bar dataKey="atual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        {previous && previous.length > 0 && (
          <Bar dataKey="anterior" fill="#d1d5db" radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
