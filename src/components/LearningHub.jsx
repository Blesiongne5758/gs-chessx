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
      <main className="mx-auto w-full max-w-6xl xl:max-w-7xl flex-1 px-4 py-6 pb-24 sm:pb-20 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-graphite via-[#11141c] to-[#0c0e14] p-6 sm:p-8 shadow-2xl shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏛️</span>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold/90">GS-ChessX Academy</p>
              </div>
              <h1 className="mt-2 font-cinzel text-2xl sm:text-3xl lg:text-4xl font-bold text-gold">
                Sharpen Strategy & Master the Board
              </h1>
              <p className="mt-2 max-w-3xl text-xs sm:text-sm leading-relaxed text-gray-300">
                Explore legendary historical masteries, solve tactical position puzzles, and test your chess acumen with strategic quizzes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <div className="rounded-xl border border-gold/20 bg-black/40 px-3.5 py-2 text-center backdrop-blur">
                <span className="block text-lg font-bold text-gold">12</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Stories</span>
              </div>
              <div className="rounded-xl border border-emerald/30 bg-black/40 px-3.5 py-2 text-center backdrop-blur">
                <span className="block text-lg font-bold text-emerald-300">12</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Puzzles</span>
              </div>
              <div className="rounded-xl border border-azure/30 bg-black/40 px-3.5 py-2 text-center backdrop-blur">
                <span className="block text-lg font-bold text-sky-300">16</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">Quizzes</span>
              </div>
            </div>
          </div>
        </section>

        <div className="w-full">
          <ChessLearningPanel />
        </div>
      </main>
      <FooterNav active="learning" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
