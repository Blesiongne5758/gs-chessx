import toast from 'react-hot-toast';
import Avatar from './Avatar';

const ITEMS = [
  { key: 'lobby', label: 'Lobby' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'social', label: 'Social', soon: true },
  { key: 'shop', label: 'Shop', soon: true },
];

export default function TopNav({ active, onNavigate, profile, onEditProfile, onLogout }) {
  return (
    <nav className="flex flex-wrap justify-between items-center gap-4 mb-8">
      <button onClick={() => onNavigate('lobby')} className="text-3xl font-cinzel font-bold text-gold">
        ♟️ GS-ChessX
      </button>
      <div className="flex flex-wrap gap-2 items-center">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => (item.soon ? toast(`${item.label} segera hadir`) : onNavigate(item.key))}
            aria-current={active === item.key ? 'page' : undefined}
            className={`px-4 py-2 rounded transition ${
              active === item.key ? 'text-gold bg-gold/10' : 'text-gray-300 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <button onClick={onEditProfile} title="Edit Profile" className="rounded-full">
            <Avatar name={profile?.username} url={profile?.avatar_url} size="w-10 h-10" />
          </button>
          <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
