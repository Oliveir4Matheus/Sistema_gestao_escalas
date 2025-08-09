import { useState, useEffect } from 'react';

interface NotificationData {
  solicitacoesPendentes: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData>({
    solicitacoesPendentes: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/solicitacoes?status=pendente', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications({
          solicitacoesPendentes: data.solicitacoes?.length || 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Polling a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    isLoading,
    refresh: loadNotifications
  };
}