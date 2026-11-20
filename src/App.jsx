import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import AuthModal from './components/AuthModal';
import EditProfile from './components/EditProfile';

const GUEST = { id: 'guest', email: 'guest@local', isGuest: true };

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('landing');
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null
  const [timeControl, setTimeControl] = useState({ label: 'Rapid (10+0)', base: 600, inc: 0 });

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) setPage('lobby');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setPage('lobby');
        setAuthMode(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function openAuth(mode) {
    if (!isSupabaseConfigured) {
      toast('Supabase belum dikonfigurasi — bermain sebagai tamu.');
      setUser(GUEST);
      setPage('lobby');
      return;
    }
    setAuthMode(mode);
  }

  async function handleLogout() {
    if (!user?.isGuest) await supabase.auth.signOut();
    setUser(null);
    setPage('landing');
  }

  function startGame(tc) {
    setTimeControl(tc);
    setPage('game');
  }

  return (
    <div className="min-h-screen bg-obsidian text-white font-inter">
      {page === 'landing' && (
        <LandingPage
          user={user}
          onPlay={() => (user ? setPage('lobby') : openAuth('signup'))}
          onLogin={() => openAuth('login')}
          onSignup={() => openAuth('signup')}
        />
      )}

      {page === 'lobby' && user && (
        <Lobby user={user} onPlay={startGame} onLogout={handleLogout} onEditProfile={() => setPage('profile')} />
      )}

      {page === 'profile' && user && <EditProfile user={user} onBack={() => setPage('lobby')} />}

      {page === 'game' && user && (
        <GameRoom user={user} timeControl={timeControl} onBack={() => setPage('lobby')} />
      )}

      {authMode && (
        <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </div>
  );
}

export default App;
