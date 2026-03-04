import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';

export function App() {
  const { user, loadFromStorage } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate, location]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-gray-900">OASYS</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.name}</span>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Sair
          </button>
        </div>
      </header>
      <nav className="bg-white border-b px-4 py-2 flex gap-4">
        <Link
          to="/payment"
          className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
            location.pathname.startsWith('/payment')
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Pagamentos
        </Link>
        {(user.role === 'CASHIER' ||
          user.role === 'MANAGER' ||
          user.role === 'OWNER') && (
          <Link
            to="/cash-register"
            className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
              location.pathname === '/cash-register'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Caixa
          </Link>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
