import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { useSoundStore } from './stores/sound.store';
import { useKDSSocket } from './hooks/useKDSSocket';

export function App() {
  const { user, loadFromStorage } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { enabled, toggle } = useSoundStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [user, navigate, location]);

  useKDSSocket();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-14">
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-gray-900">OASYS</h1>
          <span className="text-xs text-orange-500 font-medium">KDS</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className={`text-xs px-2 py-1 rounded ${
              enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {enabled ? 'Som ON' : 'Som OFF'}
          </button>
          <span className="text-sm text-gray-500">{user.name}</span>
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Sair
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-2 flex justify-around z-40">
        <NavItem
          to="/queue"
          label="Fila"
          icon="F"
          active={location.pathname === '/queue' || location.pathname === '/'}
        />
        <NavItem
          to="/stats"
          label="Stats"
          icon="S"
          active={location.pathname === '/stats'}
        />
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg text-xs font-medium ${
        active ? 'text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      <span className="text-base font-bold">{icon}</span>
      {label}
    </Link>
  );
}
