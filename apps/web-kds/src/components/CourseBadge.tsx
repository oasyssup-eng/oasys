const COURSE_COLORS: Record<string, string> = {
  DRINK: 'bg-blue-100 text-blue-700',
  STARTER: 'bg-green-100 text-green-700',
  MAIN: 'bg-orange-100 text-orange-700',
  DESSERT: 'bg-purple-100 text-purple-700',
};

const COURSE_LABELS: Record<string, string> = {
  DRINK: 'Bebida',
  STARTER: 'Entrada',
  MAIN: 'Principal',
  DESSERT: 'Sobremesa',
};

export function CourseBadge({ courseType }: { courseType: string }) {
  const color = COURSE_COLORS[courseType] ?? 'bg-gray-100 text-gray-600';
  const label = COURSE_LABELS[courseType] ?? courseType;

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {label}
    </span>
  );
}
