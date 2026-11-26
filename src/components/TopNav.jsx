import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import NotificationCenter from './NotificationCenter';
import { getNotifications, onNotificationsChange } from '../lib/notifications';

const ITEMS = [
  { key: 'lobby', label: 'Home' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'history', label: 'Match History' },
  { key: 'learning', label: 'Chess Academy' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'social', label: 'Friends & Chat' },
  { key: 'shop', label: 'Shop', soon: true },
];

export default function TopNav({
  active,
  onNavigate,
  profile,
  onEditProfile,
  onLogout,
  isAdmin,
  user,
  onAcceptChallenge,
  onOpenLeaderboard,
  onOpenHistory,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userId = user?.id || profile?.id || 'guest';
  const [unreadCount, setUnreadCount] = useState(() =>
    getNotifications(userId).filter((n) => !n.read).length
  );

  useEffect(() => {
    const updateCount = (list) => {
      const items = list || getNotifications(userId);
      setUnreadCount(items.filter((n) => !n.read).length);
    };
    updateCount();
    const unsub = onNotificationsChange(updateCount);
    return unsub;
  }, [userId]);

  const items = isAdmin ? [...ITEMS, { key: 'admin', label: 'Admin' }] : ITEMS;

  function go(item) {
    if (item.soon) {
      toast(`${item.label} coming soon`);
    } else if (item.key === 'leaderboard') {
      if (onOpenLeaderboard) onOpenLeaderboard();
      else onNavigate('leaderboard');
    } else if (item.key === 'history') {
      if (onOpenHistory) onOpenHistory();
      else onNavigate('history');
    } else {
      onNavigate(item.key);
    }
    setMenuOpen(false);
  }

  return (
    <div className="relative h-[4.75rem] sm:h-[5.25rem] w-full">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#08090d]/95 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4" aria-label="Primary navigation">
          <button type="button" onClick={() => onNavigate('lobby')} className="flex items-center gap-2 text-left" aria-label="Go to home">
            <img src="/gs-chessx-logo.png" alt="GS-ChessX logo" className="h-10 w-10 rounded-xl border border-gold/50 object-cover shadow-[0_0_18px_rgba(212,175,55,.35)]" />
            <span className="block">
              <strong className="block font-cinzel text-base sm:text-xl leading-none text-gold">GS-ChessX</strong>
              <small className="text-[9px] sm:text-[10px] tracking-[.15em] sm:tracking-[.2em] text-gray-500">PLAY · LEARN · WIN</small>
            </span>
          </button>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.03] p-1 lg:flex">
            {items.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => go(item)}
                aria-current={active === item.key ? 'page' : undefined}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active === item.key
                    ? 'bg-gold text-obsidian shadow-lg shadow-gold/20'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.04] text-lg text-gray-200 transition hover:border-gold/50 hover:text-gold"
              aria-label="Open notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onEditProfile}
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.04] py-1 pl-1 pr-3 transition hover:border-gold/50 sm:flex"
            >
              <Avatar name={profile?.username} url={profile?.avatar_url} size="h-8 w-8 text-sm" />
              <span className="max-w-24 truncate text-xs font-semibold text-gray-200">{profile?.username || 'Player'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.04] text-xl text-gray-200 hover:border-gold/50 hover:text-gold lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? '×' : '☰'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-full border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 sm:block"
            >
              Logout
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-2xl border border-white/10 bg-[#15171d] p-3 lg:hidden">
            {items.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => go(item)}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold ${
                  active === item.key ? 'bg-gold text-obsidian' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={onEditProfile} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:bg-white/10">
              Profile &amp; Settings
            </button>
            <button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-500/10">
              Logout
            </button>
          </div>
        )}
      </header>

      <NotificationCenter
        user={user || { id: userId }}
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onAcceptChallenge={onAcceptChallenge}
      />
    </div>
  );
}

export function FooterNav({ active, onNavigate, onEditProfile }) {
  return (
    <footer className="fixed bottom-3 inset-x-0 z-40 pointer-events-none px-3 sm:px-4" aria-label="Footer navigation">
      <div className="mx-auto max-w-lg">
        <nav className="pointer-events-auto flex items-center justify-around rounded-full border border-gold/30 bg-[#0e1017]/95 px-3 sm:px-5 py-2 sm:py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/10 transition-all hover:border-gold/50" aria-label="Bottom navigation">
          <BottomNavItem active={active === 'lobby'} icon="⌂" label="Home" onClick={() => onNavigate('lobby')} />
          <BottomNavItem active={active === 'quick-match' || active === 'game'} icon="♟" label="Play" onClick={() => onNavigate('quick-match')} />
          <BottomNavItem active={active === 'tournaments' || active === 'admin'} icon="♜" label="Tournaments" onClick={() => onNavigate('tournaments')} />
          <BottomNavItem active={active === 'social'} icon="☁" label="Chat" onClick={() => onNavigate('social')} />
          <BottomNavItem active={active === 'profile'} icon="●" label="Profile" onClick={onEditProfile} />
        </nav>
      </div>
    </footer>
  );
}

export function BottomNavItem({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] transition ${active ? 'text-gold' : 'text-gray-400 hover:text-white'}`}
    >
      <span className={`text-2xl leading-6 ${active ? 'drop-shadow-[0_0_8px_rgba(245,158,11,.8)]' : ''}`}>{icon}</span>
      {label}
    </button>
  );
}
