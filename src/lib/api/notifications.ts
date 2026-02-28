import { supabase } from '../supabase';

export interface Notification {
    id: string;
    user_id: string;
    type: 'promo' | 'new_restaurant' | 'review_reply' | 'badge' | 'system' | 'tip';
    title: string;
    body: string;
    icon: string;
    data: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
    return data || [];
}

export async function markAsRead(notificationId: string): Promise<void> {
    if (!supabase) return;
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
    if (!supabase) return;
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
}

export async function getUnreadCount(userId: string): Promise<number> {
    if (!supabase) return 0;
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) return 0;
    return count || 0;
}
