import { useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';

const ITEMS = [
  { key: 'lobby', label: 'Home' },
  { key: 'learning', label: 'Chess Academy' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'social', label: 'Friends & Chat' },
  { key: 'shop', label: 'Shop', soon: true },
];

export default function TopNav({ active, onNavigate, profile, onEditProfile, onLogout, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const items = isAdmin ? [...ITEMS, { key: 'admin', label: 'Admin' }] : ITEMS;

  function go(item) {
    if (item.soon) toast(`${item.label} segera hadir`);
    else onNavigate(item.key);
    setMenuOpen(false);
  }

  return (
    <div className="relative h-[4.75rem] sm:h-[5.25rem]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#08090d]/95 px-4 py-3 shadow-xl shadow-black/20 backdrop-blur-xl sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4" aria-label="Primary navigation">
          <button type="button" onClick={() => onNavigate('lobby')} className="flex items-center gap-2 text-left" aria-label="Go to home">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/50 bg-gradient-to-br from-gold/30 to-transparent text-3xl text-gold shadow-[0_0_18px_rgba(212,175,55,.2)]">♟</span>
            <span className="hidden sm:block"><strong className="block font-cinzel text-xl leading-none text-gold">GS-ChessX</strong><small className="text-[10px] tracking-[.2em] text-gray-500">PLAY · LEARN · WIN</small></span>
          </button>

          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.03] p-1 lg:flex">
            {items.map((item) => <button type="button" key={item.key} onClick={() => go(item)} aria-current={active === item.key ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${active === item.key ? 'bg-gold text-obsidian shadow-lg shadow-gold/20' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>{item.label}</button>)}
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => toast('Belum ada notifikasi baru')} className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.04] text-xl text-gray-200 transition hover:border-gold/50 hover:text-gold" aria-label="Notifications">♟<span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-rose-400" /></button>
            <button type="button" onClick={onEditProfile} className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[.04] py-1 pl-1 pr-3 transition hover:border-gold/50 sm:flex"><Avatar name={profile?.username} url={profile?.avatar_url} size="h-8 w-8 text-sm" /><span className="max-w-24 truncate text-xs font-semibold text-gray-200">{profile?.username || 'Player'}</span></button>
            <button type="button" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.04] text-xl text-gray-200 hover:border-gold/50 hover:text-gold lg:hidden" aria-label="Open menu" aria-expanded={menuOpen}>{menuOpen ? '×' : '☰'}</button>
            <button type="button" onClick={onLogout} className="hidden rounded-full border border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 sm:block">Logout</button>
          </div>
        </nav>
        {menuOpen && <div className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-2xl border border-white/10 bg-[#15171d] p-3 lg:hidden">{items.map((item) => <button type="button" key={item.key} onClick={() => go(item)} className={`rounded-xl px-4 py-3 text-left text-sm font-semibold ${active === item.key ? 'bg-gold text-obsidian' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>{item.label}</button>)}<button type="button" onClick={onEditProfile} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:bg-white/10">Profile & Settings</button><button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Logout</button></div>}
      </header>
      <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl items-center justify-around rounded-[1.5rem] border border-white/15 bg-[#0d0f15]/95 px-2 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl" aria-label="Bottom navigation">
        <BottomNavItem active={active === 'lobby'} icon="⌂" label="Home" onClick={() => onNavigate('lobby')} />
        <BottomNavItem active={active === 'quick-match' || active === 'game'} icon="♟" label="Play" onClick={() => onNavigate('quick-match')} />
        <BottomNavItem active={active === 'tournaments' || active === 'admin'} icon="♜" label="Tournaments" onClick={() => onNavigate('tournaments')} />
        <BottomNavItem active={active === 'social'} icon="☁" label="Chat" onClick={() => onNavigate('social')} />
        <BottomNavItem active={active === 'profile'} icon="●" label="Profile" onClick={onEditProfile} />
      </nav>
    </div>
  );
}

function BottomNavItem({ active, icon, label, onClick }) {
  return <button type="button" onClick={onClick} className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] transition ${active ? 'text-gold' : 'text-gray-400 hover:text-white'}`}><span className={`text-2xl leading-6 ${active ? 'drop-shadow-[0_0_8px_rgba(245,158,11,.8)]' : ''}`}>{icon}</span>{label}</button>;
}
