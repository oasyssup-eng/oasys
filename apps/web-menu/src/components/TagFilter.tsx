import { useCallback } from 'react';

interface TagFilterProps {
  /** All available tags extracted from products */
  tags: string[];
  /** Currently active tag filters */
  activeTags: string[];
  /** Callback when tags selection changes */
  onToggle: (tag: string) => void;
}

const TAG_LABELS: Record<string, string> = {
  vegano: 'Vegano',
  vegetariano: 'Vegetariano',
  sem_gluten: 'Sem Gluten',
  sem_lactose: 'Sem Lactose',
  organico: 'Organico',
  picante: 'Picante',
  gelado: 'Gelado',
  classico: 'Classico',
  refrescante: 'Refrescante',
  artesanal: 'Artesanal',
};

const TAG_ICONS: Record<string, string> = {
  vegano: '\u{1F331}',
  vegetariano: '\u{1F966}',
  sem_gluten: '\u{1F33E}',
  sem_lactose: '\u{1F95B}',
  organico: '\u{1F33F}',
  picante: '\u{1F336}\u{FE0F}',
  gelado: '\u{2744}\u{FE0F}',
  artesanal: '\u{1F3FA}',
};

export function TagFilter({ tags, activeTags, onToggle }: TagFilterProps) {
  const getLabel = useCallback(
    (tag: string) => TAG_LABELS[tag] || tag.charAt(0).toUpperCase() + tag.slice(1),
    [],
  );

  const getIcon = useCallback(
    (tag: string) => TAG_ICONS[tag] || '',
    [],
  );

  if (tags.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
      {tags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {getIcon(tag) && <span>{getIcon(tag)}</span>}
            {getLabel(tag)}
          </button>
        );
      })}
    </div>
  );
}
