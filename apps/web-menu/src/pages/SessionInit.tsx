import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function SessionInit() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initSession = useSessionStore((s) => s.initSession);
  const isOpen = useSessionStore((s) => s.isOpen);
  const sessionToken = useSessionStore((s) => s.sessionToken);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);

  useEffect(() => {
    if (!slug) return;

    const table = searchParams.get('table');
    const mode = searchParams.get('mode');
    const name = searchParams.get('name');

    initSession(slug, {
      table: table ? parseInt(table, 10) : undefined,
      mode: mode || undefined,
      name: name || undefined,
    });
  }, [slug, searchParams, initSession]);

  useEffect(() => {
    if (!sessionToken || !slug) return;

    if (!isOpen) {
      navigate(`/${slug}/closed`, { replace: true });
    } else {
      navigate(`/${slug}/menu`, { replace: true });
    }
  }, [sessionToken, isOpen, slug, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner />
        <p className="text-gray-500 text-sm">Carregando cardapio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">😕</span>
        <h2 className="text-lg font-semibold text-gray-900">Ops!</h2>
        <p className="text-gray-500 text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return <LoadingSpinner />;
}
