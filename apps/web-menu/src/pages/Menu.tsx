import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProducts, useCategories } from '../hooks/useMenu';
import { CategoryBar } from '../components/CategoryBar';
import { ProductCard } from '../components/ProductCard';
import { CartFAB } from '../components/CartFAB';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories(slug!);
  const { data: productsData, isLoading: productsLoading } = useProducts(slug!, {
    search: searchQuery || undefined,
  });

  const isLoading = categoriesLoading || productsLoading;
  const categories = productsData?.categories ?? [];

  // Set first category as active by default
  useEffect(() => {
    const first = categories[0];
    if (!activeCategory && first) {
      setActiveCategory(first.id);
    }
  }, [categories, activeCategory]);

  // Scroll to category section when tab clicked
  const handleCategorySelect = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const section = sectionRefs.current.get(categoryId);
    if (section) {
      // Account for sticky header (57px) and category bar (~48px)
      const offset = 110;
      const top = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  // Update active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offset = 120;
      let current: string | null = null;

      sectionRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset) {
          current = id;
        }
      });

      if (current) {
        setActiveCategory(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const setSectionRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {/* Search */}
      <div className="px-4 py-3 bg-white">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar no cardapio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category bar */}
      {categoriesData && categoriesData.length > 0 && !searchQuery && (
        <CategoryBar
          categories={categoriesData}
          activeId={activeCategory}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Products by category */}
      {categories.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'Nenhum produto encontrado' : 'Cardapio vazio'}
          icon={searchQuery ? '🔍' : '📋'}
        />
      ) : (
        <div className="px-4 py-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => setSectionRef(cat.id, el)}
              className="mb-6"
            >
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                {cat.name}
              </h2>
              <div className="space-y-2">
                {cat.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => navigate(`/${slug}/product/${product.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart FAB */}
      <CartFAB />
    </div>
  );
}
