import { useEffect } from 'react';
import { useOfflineStore } from '../stores/offline.store';

export function useOffline() {
  const { isOnline, setOnline, operations } = useOfflineStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  const pendingCount = operations.filter(
    (op) => op.status === 'PENDING' || op.status === 'FAILED',
  ).length;

  return { isOnline, pendingCount };
}
