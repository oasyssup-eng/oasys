import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { NotificationBadge } from './components/NotificationBadge';
import { NotificationToast } from './components/NotificationToast';
import { OfflineIndicator } from './components/OfflineIndicator';

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
    <div className="min-h-screen bg-gray-50 pb-16">
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

      <OfflineIndicator />

      <main>
        <Outlet />
      </main>

      <NotificationToast />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-2 flex justify-around z-40">
        <NavItem
          to="/tables"
          label="Mesas"
          icon="M"
          active={location.pathname.startsWith('/tables')}
        />
        <NavItem
          to="/notifications"
          label="Avisos"
          icon="N"
          active={location.pathname === '/notifications'}
          badge={<NotificationBadge />}
        />
        <NavItem
          to="/payment"
          label="Pagar"
          icon="P"
          active={location.pathname.startsWith('/payment')}
        />
        {(user.role === 'CASHIER' ||
          user.role === 'MANAGER' ||
          user.role === 'OWNER') && (
          <NavItem
            to="/cash-register"
            label="Caixa"
            icon="C"
            active={location.pathname === '/cash-register'}
          />
        )}
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
  badge,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
        active ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <div className="relative">
        <span className="text-base font-bold">{icon}</span>
        {badge && (
          <span className="absolute -top-1 -right-3">{badge}</span>
        )}
      </div>
      {label}
    </Link>
  );
}
