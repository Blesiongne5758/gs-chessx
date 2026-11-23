import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import AuthModal from './components/AuthModal';
import EditProfile from './components/EditProfile';
import Tournaments from './components/Tournaments';
import AdminTournaments from './components/AdminTournaments';
import Social from './components/Social';
import QuickMatch from './components/QuickMatch';
import LearningHub from './components/LearningHub';

const GUEST = { id: 'guest', email: 'guest@local', isGuest: true };

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('landing');
  const [authMode, setAuthMode] = useState(null); // 'login' | 'signup' | null
  const [timeControl, setTimeControl] = useState({ label: 'Rapid (10+0)', base: 600, inc: 0 });
  const [match, setMatch] = useState(null);
  const confirmationPending = useRef(new URLSearchParams(window.location.search).get('email-confirmed') === '1');
  const confirmationDone = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let alive = true;
    function completeEmailConfirmation() {
      if (confirmationDone.current) return;
      confirmationDone.current = true;
      confirmationPending.current = false;
      setUser(null);
      setAuthMode(null);
      setPage('email-confirmed');
      window.history.replaceState({}, '', window.location.pathname);
      window.setTimeout(() => supabase.auth.signOut({ scope: 'local' }), 0);
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (confirmationDone.current) return;
      if (confirmationPending.current && session?.user) { completeEmailConfirmation(); return; }
      setUser(session?.user ?? null);
      if (session?.user) setPage('lobby');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (confirmationPending.current && session?.user) { completeEmailConfirmation(); return; }
      if (confirmationDone.current && event === 'SIGNED_OUT') return;
      setUser(session?.user ?? null);
      if (session?.user) {
        setPage('lobby');
        setAuthMode(null);
      } else if (event === 'SIGNED_OUT') {
        setPage('landing');
      }
    });

    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (page !== 'email-confirmed') return undefined;
    const timer = window.setTimeout(() => { setPage('landing'); setAuthMode('login'); }, 3500);
    return () => window.clearTimeout(timer);
  }, [page]);

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

      {page === 'email-confirmed' && (
        <main className="grid min-h-screen place-items-center bg-obsidian px-4 text-center">
          <section role="status" aria-live="polite" className="max-w-lg rounded-2xl border border-gold/40 bg-graphite p-8 shadow-xl shadow-gold/10">
            <div className="text-5xl text-emerald-400" aria-hidden="true">✓</div>
            <h1 className="mt-5 font-cinzel text-2xl font-bold text-gold">Selamat akun anda sudah dapat digunakan, Happy Chess Game</h1>
            <p className="mt-3 text-sm text-gray-300">Email berhasil dikonfirmasi. Anda akan diarahkan ke halaman login.</p>
            <button onClick={() => { setPage('landing'); setAuthMode('login'); }} className="mt-6 rounded-lg bg-gold px-6 py-3 font-bold text-obsidian hover:bg-champagne">Lanjut ke login</button>
          </section>
        </main>
      )}

      {page === 'lobby' && user && (
        <Lobby
          user={user}
          onPlay={(tc) => {
            setTimeControl(tc);
            if (tc.mode === 'ai') {
              setMatch({ mode: 'ai', aiLevel: tc.aiLevel || 10, opponent: { username: 'Komputer' } });
              setPage('game');
            } else {
              setMatch(null);
              setPage('quick-match');
            }
          }}
          onLogout={handleLogout}
          onEditProfile={() => setPage('profile')}
          onNavigate={setPage}
        />
      )}

      {page === 'quick-match' && user && (
        <QuickMatch
          user={user}
          timeControl={timeControl}
          onNavigate={setPage}
          onEditProfile={() => setPage('profile')}
          onLogout={handleLogout}
          onBack={() => setPage('lobby')}
          onMatched={(nextMatch) => { setMatch(nextMatch); setTimeControl(nextMatch.timeControl || timeControl); setPage('game'); }}
        />
      )}

      {page === 'tournaments' && user && (
        <Tournaments
          user={user}
          onNavigate={setPage}
          onEditProfile={() => setPage('profile')}
          onLogout={handleLogout}
        />
      )}

      {page === 'admin' && user && (
        <AdminTournaments
          user={user}
          onNavigate={setPage}
          onEditProfile={() => setPage('profile')}
          onLogout={handleLogout}
        />
      )}

      {page === 'profile' && user && <EditProfile user={user} onBack={() => setPage('lobby')} onNavigate={setPage} onEditProfile={() => setPage('profile')} onLogout={handleLogout} />}

      {page === 'social' && user && (
        <Social user={user} onNavigate={setPage} onEditProfile={() => setPage('profile')} onLogout={handleLogout} />
      )}

      {page === 'learning' && user && (
        <LearningHub user={user} onNavigate={setPage} onEditProfile={() => setPage('profile')} onLogout={handleLogout} />
      )}

      {page === 'game' && user && (
        <GameRoom user={user} timeControl={timeControl} match={match} onBack={() => { setMatch(null); setPage('lobby'); }} onSocial={() => setPage('social')} onNavigate={setPage} onEditProfile={() => setPage('profile')} onLogout={handleLogout} />
      )}

      {authMode && (
        <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />
      )}
    </div>
  );
}

export default App;
