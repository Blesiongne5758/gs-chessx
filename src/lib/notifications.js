/**
 * GS-ChessX — Notifications Service
 * In-app notification center, live unread counter, and web notification dispatcher.
 */

const NOTIFICATION_EVENT = 'gs_chessx_notification_change';
const STORAGE_KEY = 'gs_chessx_notifications';

function getStorageKey(userId = 'guest') {
  return `${STORAGE_KEY}_${userId}`;
}

export function getNotifications(userId = 'guest') {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotifications(userId = 'guest', list) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(list.slice(0, 50)));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail: { list } }));
  } catch {
    // Storage quota or disabled
  }
}

export function addNotification(userId = 'guest', notif) {
  const current = getNotifications(userId);
  const newEntry = {
    id: notif.id || crypto.randomUUID(),
    title: notif.title || 'Notification',
    message: notif.message || '',
    type: notif.type || 'system', // 'challenge' | 'game_result' | 'friend' | 'system'
    read: false,
    timestamp: new Date().toISOString(),
    data: notif.data || null,
  };

  const updated = [newEntry, ...current.filter((n) => n.id !== newEntry.id)];
  saveNotifications(userId, updated);

  // Request & send desktop notification if supported
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(newEntry.title, {
        body: newEntry.message,
        icon: '/favicon.svg',
      });
    } catch {
      // Notification blocked by OS or browser
    }
  }

  return newEntry;
}

export function markNotificationRead(userId = 'guest', id) {
  const current = getNotifications(userId);
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(userId, updated);
  return updated;
}

export function markAllNotificationsRead(userId = 'guest') {
  const current = getNotifications(userId);
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(userId, updated);
  return updated;
}

export function clearNotifications(userId = 'guest') {
  saveNotifications(userId, []);
  return [];
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function onNotificationsChange(callback) {
  const handler = (e) => callback(e.detail?.list);
  window.addEventListener(NOTIFICATION_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
}
