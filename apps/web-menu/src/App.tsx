import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useSessionStore } from './stores/session.store';
import { useCheckUpdates } from './hooks/useCheckUpdates';
import { ToastProvider } from './components/NotificationToast';

function AppLayout() {
  const { slug } = useParams();
  const unit = useSessionStore((s) => s.unit);
  const navigate = useNavigate();

  // Subscribe to real-time check updates (invalidates queries automatically)
  useCheckUpdates(slug);

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      {/* Header */}
      {unit && (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 p-1"
            aria-label="Voltar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {unit.name}
            </h1>
          </div>
          <button
            onClick={() => navigate(`/${slug}/orders`)}
            className="text-gray-600 hover:text-gray-900 p-1"
            aria-label="Meus pedidos"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
        </header>
      )}

      {/* Main content */}
      <main className="pb-24">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppLayout />
    </ToastProvider>
  );
}
