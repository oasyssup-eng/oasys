import { useOffline } from '../hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
        isOnline
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {!isOnline
        ? `Offline — ${pendingCount} operac${pendingCount === 1 ? 'ao' : 'oes'} pendente${pendingCount === 1 ? '' : 's'}`
        : `Sincronizando ${pendingCount} operac${pendingCount === 1 ? 'ao' : 'oes'}...`}
    </div>
  );
}
