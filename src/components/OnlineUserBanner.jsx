import { useEffect, useState } from 'react';
import { onUserOnlineAlert } from '../lib/onlineAlerts';

export default function OnlineUserBanner() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubscribe = onUserOnlineAlert((newAlert) => {
      setAlerts((prev) => [...prev, { ...newAlert, state: 'entering' }]);
    });
    return unsubscribe;
  }, []);

  function handleDismiss(id) {
    setAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, state: 'closing' } : item))
    );
    setTimeout(() => {
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    }, 400);
  }

  if (alerts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center pt-3 sm:pt-4 px-4 gap-2"
    >
      {alerts.map((item) => (
        <BannerItem key={item.id} item={item} onDismiss={() => handleDismiss(item.id)} />
      ))}
    </div>
  );
}

function BannerItem({ item, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isClosing = item.state === 'closing';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 rounded-full border border-gold/60 bg-[#0f1118]/95 px-4 py-2 sm:px-5 sm:py-2.5 text-white shadow-[0_12px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(212,175,55,0.25)] backdrop-blur-md transition-all ${
        isClosing ? 'banner-slide-up' : 'banner-slide-down'
      }`}
    >
      {/* Online Pulsing Indicator */}
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
      </span>

      {/* User Avatar or Default Chess Icon */}
      {item.avatarUrl ? (
        <img
          src={item.avatarUrl}
          alt={item.username}
          className="h-6 w-6 rounded-full border border-gold/40 object-cover"
        />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/20 border border-gold/40 text-xs text-gold">
          ♟
        </span>
      )}

      {/* Message: "(username) now online" */}
      <p className="text-xs sm:text-sm font-medium tracking-wide text-gray-200">
        <span className="font-bold text-gold">{item.username}</span> now online
      </p>

      {/* Close button that triggers slide up */}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 text-gray-400 hover:text-white transition rounded-full p-1 text-xs hover:bg-white/10 leading-none"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
