import ChessLearningPanel from './ChessLearningPanel';
import TopNav, { FooterNav } from './TopNav';

export default function LearningHub({ user, onNavigate, onEditProfile, onLogout }) {
  const username = user?.isGuest ? 'You (Guest)' : user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player';

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex flex-col">
      <TopNav
        active="learning"
        onNavigate={onNavigate}
        profile={{ username, avatar_url: user?.user_metadata?.avatar_url }}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={user?.isGuest}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:pb-20 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-gold/25 bg-gradient-to-br from-graphite to-[#11141c] p-6 shadow-xl shadow-black/20">
          <p className="text-[10px] uppercase tracking-[0.24em] text-gold/80">Chess Academy</p>
          <h1 className="mt-2 font-cinzel text-3xl font-bold text-gold">Sharpen your strategy before returning to the board</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">Solve puzzles to master positional principles, or complete quizzes to test your chess history and strategic decision-making.</p>
        </section>
        <div className="max-w-2xl">
          <ChessLearningPanel />
        </div>
      </main>
      <FooterNav active="learning" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
