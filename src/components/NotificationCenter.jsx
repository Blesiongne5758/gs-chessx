import { useState, useEffect } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  requestNotificationPermission,
  onNotificationsChange,
} from '../lib/notifications';

export default function NotificationCenter({ user, isOpen, onClose, onAcceptChallenge }) {
  const userId = user?.id || 'guest';
  const [notifications, setNotifications] = useState(() => getNotifications(userId));

  useEffect(() => {
    setNotifications(getNotifications(userId));
    const unsubscribe = onNotificationsChange((updated) => {
      setNotifications(updated || getNotifications(userId));
    });
    return unsubscribe;
  }, [userId]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'challenge':
        return '⚔️';
      case 'game_result':
        return '🏆';
      case 'friend':
        return '👥';
      case 'rating_update':
        return '📈';
      default:
        return '📢';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-gold/30 bg-[#12141c] p-4 sm:p-5 shadow-2xl shadow-gold/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h2 className="font-cinzel text-lg font-bold text-gold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close notifications"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between py-2 text-xs text-gray-400 border-b border-white/5">
          <button
            onClick={async () => {
              const perm = await requestNotificationPermission();
              if (perm === 'granted') alert('Desktop notifications enabled!');
            }}
            className="hover:text-gold transition flex items-center gap-1"
          >
            <span>🖥️</span> Enable Desktop Alerts
          </button>
          <div className="flex gap-3">
            {unreadCount > 0 && (
              <button
                onClick={() => setNotifications(markAllNotificationsRead(userId))}
                className="hover:text-gold transition"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => setNotifications(clearNotifications(userId))}
                className="hover:text-rose-400 transition"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 max-h-96 space-y-2.5 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              <span className="text-3xl block mb-2 opacity-50">📭</span>
              No notifications right now.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => setNotifications(markNotificationRead(userId, item.id))}
                className={`relative rounded-xl border p-3.5 transition cursor-pointer ${
                  item.read
                    ? 'border-white/5 bg-white/[0.02] text-gray-300 hover:border-white/15'
                    : 'border-gold/40 bg-gold/[0.05] text-white hover:border-gold shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{getTypeIcon(item.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gold truncate">{item.title}</h4>
                      <time className="text-[10px] text-gray-400 shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-gray-300 leading-relaxed">{item.message}</p>

                    {item.type === 'challenge' && item.data && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAcceptChallenge?.(item.data);
                            onClose();
                          }}
                          className="rounded-lg bg-gold px-3 py-1 text-xs font-bold text-obsidian hover:bg-champagne transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications(markNotificationRead(userId, item.id));
                          }}
                          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xs text-gray-300 hover:bg-white/10 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
