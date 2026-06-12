import useSWR from 'swr';
import { api } from './api-client';
import { useAuth } from './auth-context';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    read: boolean;
    relatedData?: Record<string, any>;
    createdAt: string;
}

export function useNotifications() {
    const { user } = useAuth();

    const { data: notifications = [], mutate, error, isLoading } = useSWR<AppNotification[]>(
        user ? `/notifications/${user.id}` : null,
        async (url) => {
            const data = await api.get<AppNotification[]>(url);
            return data || [];
        },
        { refreshInterval: 30000 } // Auto-refresh every 30 seconds
    );

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (notificationId: string) => {
        if (!user) return;
        // Optimistic update
        mutate(
            notifications.map(n => n.id === notificationId ? { ...n, read: true } : n),
            false
        );
        try {
            await api.put(`/notifications/${notificationId}/read`, { userId: user.id });
            mutate();
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            mutate(); // Revert on failure
        }
    };

    const markAllAsRead = async () => {
        if (!user || unreadCount === 0) return;
        // Optimistic update
        mutate(
            notifications.map(n => ({ ...n, read: true })),
            false
        );
        try {
            await api.put('/notifications/read-all', { userId: user.id });
            mutate();
        } catch (err) {
            console.error('Failed to mark all as read:', err);
            mutate(); // Revert on failure
        }
    };

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        mutate
    };
}
