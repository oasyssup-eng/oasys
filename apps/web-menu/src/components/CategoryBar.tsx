import { useRef, useEffect } from 'react';

interface CategoryBarProps {
  categories: Array<{ id: string; name: string }>;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryBar({ categories, activeId, onSelect }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const active = scrollRef.current.querySelector(`[data-id="${activeId}"]`);
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="sticky top-[57px] z-40 bg-white border-b border-gray-200 overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-1 px-3 py-2 min-w-max">
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-id={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              activeId === cat.id
                ? 'bg-orange-500 text-white font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
