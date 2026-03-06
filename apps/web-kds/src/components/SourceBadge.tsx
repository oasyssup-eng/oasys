export function SourceBadge({ source }: { source: string }) {
  const isWeb = source === 'WEB_MENU';
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isWeb
          ? 'bg-blue-100 text-blue-600'
          : 'bg-gray-100 text-gray-600'
      }`}
      title={isWeb ? 'Cardapio Digital' : 'Garcom'}
    >
      {isWeb ? 'WEB' : 'PDV'}
    </span>
  );
}
