import React, { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/api/notifications';

interface Props {
    userId: string;
    isOpen: boolean;
    onClose: () => void;
    onUnreadCountChange: (count: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
    promo: 'from-orange-500 to-red-500',
    new_restaurant: 'from-green-500 to-emerald-500',
    review_reply: 'from-blue-500 to-indigo-500',
    badge: 'from-yellow-500 to-amber-500',
    system: 'from-purple-500 to-violet-500',
    tip: 'from-cyan-500 to-blue-500',
};

const TYPE_LABELS: Record<string, string> = {
    promo: 'Promoção',
    new_restaurant: 'Novo Restaurante',
    review_reply: 'Resposta',
    badge: 'Conquista',
    system: 'Sistema',
    tip: 'Dica',
};

export default function NotificationModal({ userId, isOpen, onClose, onUnreadCountChange }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && userId) {
            setLoading(true);
            getNotifications(userId).then(data => {
                setNotifications(data);
                setLoading(false);
                onUnreadCountChange(data.filter(n => !n.is_read).length);
            });
        }
    }, [isOpen, userId]);

    const handleRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        onUnreadCountChange(notifications.filter(n => !n.is_read && n.id !== id).length);
    };

    const handleMarkAll = async () => {
        await markAllAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        onUnreadCountChange(0);
    };

    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Agora';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel - slides up from bottom */}
            <div className="relative mt-auto max-h-[85vh] bg-white dark:bg-[#121216] rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-primary text-xl">notifications</span>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notificações</h2>
                        {notifications.filter(n => !n.is_read).length > 0 && (
                            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {notifications.filter(n => !n.is_read).length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.some(n => !n.is_read) && (
                            <button
                                onClick={handleMarkAll}
                                className="text-xs text-primary font-semibold hover:underline"
                            >
                                Marcar tudo
                            </button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <span className="material-icons text-gray-500 text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-4 pt-3 pb-24 space-y-2">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="text-2xl animate-pulse mb-2">🔔</div>
                            <p className="text-gray-400 text-sm">Carregando...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                            <div className="text-4xl">🔕</div>
                            <p className="text-gray-500 font-medium text-sm">Nenhuma notificação</p>
                            <p className="text-gray-400 text-xs">Você será notificado sobre promoções, novos restaurantes e mais!</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <button
                                key={notif.id}
                                onClick={() => !notif.is_read && handleRead(notif.id)}
                                className={`w-full text-left flex gap-3 p-3 rounded-xl transition-all ${notif.is_read
                                    ? 'bg-gray-50 dark:bg-white/5 opacity-60'
                                    : 'bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10 hover:shadow-md'
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TYPE_COLORS[notif.type] || TYPE_COLORS.system} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                    <span className="material-icons text-white text-lg">{notif.icon}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r ${TYPE_COLORS[notif.type] || TYPE_COLORS.system} text-white`}>
                                            {TYPE_LABELS[notif.type] || 'Aviso'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{formatTime(notif.created_at)}</span>
                                    </div>
                                    <p className={`text-sm font-semibold leading-tight ${notif.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                                        {notif.body}
                                    </p>
                                </div>

                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <div className="flex-shrink-0 self-center">
                                        <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
