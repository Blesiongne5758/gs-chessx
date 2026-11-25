/**
 * Global alert system for notifying online users when a player logs in / comes online.
 */

const listeners = new Set();

/**
 * Subscribe to online user alerts.
 * @param {Function} callback - Function called with { id, username, avatarUrl, createdAt }
 * @returns {Function} Unsubscribe function
 */
export function onUserOnlineAlert(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Trigger an online alert for a user.
 * @param {string} username - Name of the user who logged in / came online
 * @param {string|null} avatarUrl - Optional avatar image URL
 * @returns {Object|null} The created alert object, or null if username was invalid
 */
export function triggerUserOnlineAlert(username, avatarUrl = null) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    return null;
  }

  const alert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: username.trim(),
    avatarUrl: avatarUrl || null,
    createdAt: Date.now(),
  };

  listeners.forEach((cb) => {
    try {
      cb(alert);
    } catch (err) {
      console.error('Error invoking online alert callback:', err);
    }
  });

  return alert;
}
