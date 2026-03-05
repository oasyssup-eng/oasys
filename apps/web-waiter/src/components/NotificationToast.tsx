import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../stores/notification.store';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
}

export function NotificationToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notifications = useNotificationStore((s) => s.notifications);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const latest = notifications[0];
    if (!latest || latest.isRead) return;

    // Only show toast for new notifications (within last 5 seconds)
    const age = Date.now() - new Date(latest.createdAt).getTime();
    if (age > 5000) return;

    const toast: ToastMessage = {
      id: latest.id,
      title: latest.title,
      message: latest.message,
    };

    setToasts((prev) => {
      if (prev.some((t) => t.id === toast.id)) return prev;
      return [toast, ...prev].slice(0, 3);
    });

    const timer = setTimeout(() => dismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [notifications, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 space-y-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 cursor-pointer animate-slide-in"
        >
          <div className="text-sm font-semibold text-gray-900">
            {toast.title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}
