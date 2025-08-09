'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBadgeProps {
  userRole: string;
  onClick: () => void;
}

export default function NotificationBadge({ userRole, onClick }: NotificationBadgeProps) {
  const { notifications, isLoading } = useNotifications();

  // Só mostrar para quem pode aprovar solicitações
  if (!['analista', 'gerencia'].includes(userRole)) {
    return null;
  }

  const hasNotifications = notifications.solicitacoesPendentes > 0;

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      title={`${notifications.solicitacoesPendentes} solicitações pendentes`}
    >
      <Bell className="h-6 w-6" />
      {hasNotifications && !isLoading && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {notifications.solicitacoesPendentes > 99 ? '99+' : notifications.solicitacoesPendentes}
        </span>
      )}
    </button>
  );
}