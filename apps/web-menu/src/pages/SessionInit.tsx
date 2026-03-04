import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store';

const SPLASH_DURATION = 1500; // 1.5 seconds

export default function SessionInit() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initSession = useSessionStore((s) => s.initSession);
  const isOpen = useSessionStore((s) => s.isOpen);
  const sessionToken = useSessionStore((s) => s.sessionToken);
  const unit = useSessionStore((s) => s.unit);
  const context = useSessionStore((s) => s.context);
  const loading = useSessionStore((s) => s.loading);
  const error = useSessionStore((s) => s.error);

  const [splashDone, setSplashDone] = useState(false);

  // Start session initialization
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

  // Start splash timer once session is loaded
  useEffect(() => {
    if (!sessionToken) return;

    const timer = setTimeout(() => {
      setSplashDone(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [sessionToken]);

  // Navigate after splash completes
  useEffect(() => {
    if (!splashDone || !sessionToken || !slug) return;

    if (!isOpen) {
      navigate(`/${slug}/closed`, { replace: true });
    } else {
      navigate(`/${slug}/menu`, { replace: true });
    }
  }, [splashDone, sessionToken, isOpen, slug, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <span className="text-4xl">{'\u{1F615}'}</span>
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

  // Splash screen with unit branding
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-50 to-white px-6">
      {/* Logo / Unit Name */}
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-3xl text-white">{'\u{1F37D}\u{FE0F}'}</span>
        </div>

        {unit ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
            {context?.type === 'TABLE' && context.tableNumber && (
              <p className="text-base text-gray-500 mt-2">
                Mesa {context.tableNumber}
                {context.zoneName ? ` \u2014 ${context.zoneName}` : ''}
              </p>
            )}
            {context?.type === 'COUNTER' && context.customerName && (
              <p className="text-base text-gray-500 mt-2">
                {context.customerName}
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              {slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Cardapio Digital'}
            </h1>
          </>
        )}
      </div>

      {/* Loading indicator */}
      <div className="mt-10">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-500 border-t-transparent" />
            <p className="text-sm text-gray-400">Carregando cardapio...</p>
          </div>
        ) : sessionToken && !splashDone ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
