import { useNotificationStore } from '../stores/notification.store';

export function NotificationBadge() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  if (unreadCount === 0) return null;

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
