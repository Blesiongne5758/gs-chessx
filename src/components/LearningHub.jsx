import ChessLearningPanel from './ChessLearningPanel';
import TopNav from './TopNav';

export default function LearningHub({ user, onNavigate, onEditProfile, onLogout }) {
  const username = user?.isGuest ? 'You (Guest)' : user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player';

  return (
    <div className="min-h-screen bg-obsidian p-6">
      <TopNav
        active="learning"
        onNavigate={onNavigate}
        profile={{ username, avatar_url: user?.user_metadata?.avatar_url }}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={user?.isGuest}
      />
      <main className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-2xl border border-gold/25 bg-gradient-to-br from-graphite to-[#11141c] p-6 shadow-xl shadow-black/20">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/80">Chess Academy</p>
          <h1 className="mt-2 font-cinzel text-3xl font-bold text-gold">Asah strategi sebelum kembali ke papan</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">Pilih puzzle untuk melatih prinsip posisi, atau selesaikan quiz untuk menguji ingatan sejarah dan keputusan strategis. Materi ini berada di luar permainan agar fokus tetap utuh saat pertandingan berlangsung.</p>
        </section>
        <div className="max-w-2xl">
          <ChessLearningPanel />
        </div>
      </main>
    </div>
  );
}
