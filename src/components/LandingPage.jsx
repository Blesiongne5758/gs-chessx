import { useState } from 'react';

const LANDING_FEATURES = [
  { key: 'board', icon: '♟', title: '2D / 3D Board', desc: 'Switch seamlessly between classic 2D view and immersive 3D board', tone: 'gold' },
  { key: 'academy', icon: '♞', title: 'Chess Academy', desc: 'Master tactics, opening principles, and interactive puzzle trainers', tone: 'blue' },
  { key: 'tournaments', icon: '♜', title: 'Swiss Tournaments', desc: 'Scheduled competitions with official Swiss pairings & brackets', tone: 'violet' },
  { key: 'voice', icon: '🎙️', title: 'Voice & Video Talk', desc: 'Realtime 2-way audio and video talk while playing or chatting', tone: 'green' },
  { key: 'social', icon: '☁', title: 'Friends & Chat', desc: 'Add friends, challenge quick duels, and send instant messages', tone: 'cyan' },
  { key: 'ai', icon: '🤖', title: 'Stockfish AI (10 Levels)', desc: 'Sharpen your skills against Stockfish.js engine from beginner (800 Elo) to Grandmaster (2600+ Elo)', tone: 'slate' },
];

export default function LandingPage({ onPlay, onLogin, onSignup, user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#08090d] text-white flex flex-col font-inter">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090d]/95 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-xl sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4" aria-label="Main Navigation">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold/50 bg-gradient-to-br from-gold/30 to-transparent text-3xl text-gold shadow-[0_0_18px_rgba(212,175,55,.2)]">
              ♟
            </span>
            <div>
              <strong className="block font-cinzel text-xl leading-none text-gold">GS-ChessX</strong>
              <small className="text-[10px] tracking-[.2em] text-gray-500">PLAY · LEARN · WIN</small>
            </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[.03] p-1 md:flex">
            <a href="#hero" className="rounded-full px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white">
              Home
            </a>
            <a href="#features" className="rounded-full px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white">
              Features
            </a>
            <a href="#tournaments" className="rounded-full px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white">
              Tournaments
            </a>
            <button type="button" onClick={onPlay} className="rounded-full px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white">
              Chess Academy
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <button
                type="button"
                onClick={onPlay}
                className="rounded-full bg-gradient-to-r from-gold to-champagne px-4 sm:px-5 py-2 text-xs sm:text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 transition hover:shadow-gold/40"
              >
                Lobby ›
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="rounded-full border border-white/15 bg-white/[.04] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-200 transition hover:border-gold/50 hover:text-gold"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={onSignup}
                  className="hidden sm:inline-flex rounded-full bg-gradient-to-r from-gold to-champagne px-5 py-2 text-xs sm:text-sm font-extrabold text-obsidian shadow-lg shadow-gold/25 transition hover:shadow-gold/40"
                >
                  Sign Up
                </button>
              </>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[.04] text-xl text-gray-200 hover:border-gold/50 hover:text-gold md:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-2xl border border-white/10 bg-[#15171d] p-3 md:hidden">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Top Features
            </a>
            <a
              href="#tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Tournaments
            </a>
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); onPlay(); }}
              className="rounded-xl bg-gold/15 px-4 py-3 text-left text-sm font-semibold text-gold hover:bg-gold hover:text-obsidian transition"
            >
              Play Chess Now
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-28 sm:pb-24 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section id="hero" className="relative isolate min-h-[340px] sm:min-h-[420px] overflow-hidden rounded-[2rem] border border-gold/40 bg-[#15130f] shadow-[0_20px_70px_rgba(245,158,11,.15)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-screen"
            style={{ backgroundImage: "url('/historical-reykjavik.png')" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_73%_46%,rgba(245,158,11,.38),transparent_26%),linear-gradient(120deg,#0d1118_0%,#1d1b16_46%,#39270e_100%)]" />
          <div className="absolute -right-20 -top-36 h-[28rem] w-[28rem] rounded-full border-[26px] border-gold/10 shadow-[0_0_100px_rgba(245,158,11,.32)]" />
          <div className="hidden sm:block absolute -right-10 bottom-[-80px] text-[18rem] leading-none text-gold/20 blur-[1px] select-none pointer-events-none sm:right-20">
            ♔
          </div>
          <div className="sm:hidden absolute right-2 bottom-3 text-8xl text-gold/15 leading-none select-none pointer-events-none">
            ♔
          </div>
          <div className="absolute inset-y-0 right-0 w-3/5 opacity-30 [background-image:linear-gradient(30deg,transparent_48%,rgba(245,158,11,.5)_49%,transparent_50%),linear-gradient(150deg,transparent_48%,rgba(255,255,255,.18)_49%,transparent_50%)] [background-size:44px_44px]" />

          <div className="relative z-10 flex min-h-[340px] sm:min-h-[420px] max-w-2xl flex-col justify-center p-5 sm:p-12">
            <div className="flex sm:hidden items-center gap-2 mb-2.5">
              <span className="text-gold font-bold text-xs tracking-[0.25em] font-cinzel uppercase">GS-CHESSX</span>
              <span className="h-px flex-1 bg-gradient-to-r from-gold/50 to-transparent" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] sm:tracking-[0.25em] text-gold w-fit shadow-sm">
              <span>⚔️</span> The Battle of Ideologies
            </div>
            <h1 className="mt-3 sm:mt-4 font-cinzel text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] text-white tracking-tight">
              Play chess.<br />
              <span className="text-gold drop-shadow-[0_2px_14px_rgba(212,175,55,0.4)]">Grow together.</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-lg text-xs sm:text-base text-gray-300 leading-relaxed">
              Holy Kingdom vs Anarchy Rebellion. Find opponents, sharpen tactics with AI and Chess Academy, and claim victory on GS-ChessX.
            </p>
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={onPlay}
                className="w-full sm:w-auto text-center rounded-full bg-gradient-to-r from-gold to-champagne px-7 py-3.5 text-sm sm:text-base font-extrabold text-obsidian shadow-lg shadow-gold/25 transition hover:-translate-y-0.5 hover:shadow-gold/40"
              >
                Play Now <span aria-hidden="true">›</span>
              </button>
              <button
                type="button"
                onClick={user ? onPlay : onSignup}
                className="w-full sm:w-auto text-center rounded-full border border-white/20 bg-black/35 px-6 py-3.5 text-sm sm:text-base font-semibold text-white backdrop-blur transition hover:border-gold/60 hover:text-gold"
              >
                {user ? 'Go to Lobby' : 'Sign Up Free'}
              </button>
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden="true">
            <span className="h-2 w-7 rounded-full bg-gold" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
          </div>
        </section>

        {/* Live Platform Stats */}
        <section className="relative mt-6 rounded-[1.75rem] border border-gold/50 bg-gradient-to-br from-[#17181f] via-[#11131a] to-[#252014] p-5 shadow-[0_18px_50px_rgba(0,0,0,.55)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-2xl text-gold">⚡</span>
              <div>
                <h2 className="font-cinzel text-lg font-bold text-white">Modern Chess Platform</h2>
                <p className="text-xs text-gray-400">Active chess community with smart matchmaking</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-xs text-emerald">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse" /> Realtime Server Online
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 text-center">
            <div className="py-2 sm:py-0 px-2">
              <div className="text-2xl sm:text-3xl font-bold text-gold">12,847+</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">Active Players</div>
            </div>
            <div className="py-2 sm:py-0 px-2">
              <div className="text-2xl sm:text-3xl font-bold text-emerald">48,200+</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">Matches Played</div>
            </div>
            <div className="py-2 sm:py-0 px-2">
              <div className="text-2xl sm:text-3xl font-bold text-azure">10 Levels</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">AI Difficulty</div>
            </div>
            <div className="py-2 sm:py-0 px-2">
              <div className="text-2xl sm:text-3xl font-bold text-champagne">Swiss System</div>
              <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-400">Tournament Format</div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Core Features</p>
              <h2 className="mt-1 font-cinzel text-2xl sm:text-3xl font-bold text-white">Everything You Need to Master Chess</h2>
            </div>
            <button type="button" onClick={onPlay} className="text-sm font-semibold text-gold hover:text-champagne transition">
              Explore All →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANDING_FEATURES.map((feat) => (
              <div
                key={feat.key}
                className={`feature-tile feature-${feat.tone} group relative min-h-[140px] overflow-hidden rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:shadow-xl`}
              >
                <span className="absolute -right-2 -top-5 text-8xl font-serif opacity-10 transition group-hover:scale-110">
                  {feat.icon}
                </span>
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-white drop-shadow">{feat.icon}</span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-xl leading-none text-white">›</span>
                  </div>
                  <div className="mt-4">
                    <strong className="block text-base sm:text-lg text-white font-cinzel">{feat.title}</strong>
                    <p className="mt-1 text-xs text-white/80 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tournament & Academy Showcase */}
        <section id="tournaments" className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.75rem] border border-gold/35 bg-gradient-to-br from-[#171719] to-[#0f1014] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-gold">♜</span>
                <div>
                  <h2 className="font-cinzel text-xl font-bold text-white">GS-ChessX Championship</h2>
                  <p className="text-xs text-gray-500">Official Swiss Tournaments & Brackets</p>
                </div>
              </div>
              <span className="rounded-full bg-gold/15 border border-gold/40 px-3 py-1 text-xs font-bold text-gold">
                Upcoming
              </span>
            </div>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-32 w-full place-items-center rounded-2xl border border-gold/30 bg-[radial-gradient(circle,rgba(245,158,11,.35),transparent_52%),linear-gradient(135deg,#211b0d,#090a0e)] sm:h-36 sm:w-44">
                <div className="text-center">
                  <div className="text-7xl leading-none text-gold drop-shadow-[0_0_15px_rgba(245,158,11,.7)]">♜</div>
                  <span className="text-[10px] uppercase tracking-[.28em] text-gold/70">Championship</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-cinzel text-xl font-bold text-white">Grand Swiss Tour 2026</h3>
                <p className="mt-2 text-sm text-gray-300">▣ &nbsp;Registration open for all registered players</p>
                <p className="mt-1 text-sm text-gray-300">♟ &nbsp;128 Players · Fair matchmaking based on ELO</p>
                <button
                  type="button"
                  onClick={onPlay}
                  className="mt-4 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-obsidian transition hover:bg-champagne shadow-md shadow-gold/20"
                >
                  Join Tournament →
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#15171d] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-cinzel text-xl font-bold text-white">Chess Academy</h2>
                <span className="text-2xl">🎓</span>
              </div>
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                Level up your chess rating with interactive tactical positions, progressive checkmate patterns, and legendary chess history quizzes.
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-white/[.04] p-2.5 text-xs text-gray-300">
                  <span className="text-gold font-bold">✓</span> Tactical Puzzles & Checkmate Patterns
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/[.04] p-2.5 text-xs text-gray-300">
                  <span className="text-gold font-bold">✓</span> Historical Quizzes & Classic Game Analysis
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onPlay}
              className="mt-5 w-full rounded-full border border-gold/40 bg-gold/10 py-2.5 text-sm font-bold text-gold transition hover:bg-gold hover:text-obsidian"
            >
              Start Learning
            </button>
          </div>
        </section>
      </main>

      {/* Static Footer */}
      <footer className="mt-12 border-t border-white/10 bg-[#08090d] px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-xl text-gold">♟</span>
            <span className="font-cinzel text-lg font-bold text-gold">GS-ChessX</span>
            <span className="text-xs text-gray-500">· The Battle of Ideologies</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <button type="button" onClick={onPlay} className="hover:text-white transition">Play Now</button>
            <button type="button" onClick={onLogin} className="hover:text-white transition">Login</button>
            <button type="button" onClick={onSignup} className="hover:text-white transition">Sign Up</button>
            <span>&copy; 2026 GS-ChessX. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Floating Bottom Navigation Dock (Mobile & Desktop View) */}
      <div className="fixed bottom-3 inset-x-0 z-40 pointer-events-none px-3 sm:px-4" aria-label="Floating landing navigation">
        <div className="mx-auto max-w-md">
          <nav className="pointer-events-auto flex items-center justify-around rounded-full border border-gold/30 bg-[#0e1017]/95 px-4 py-2 sm:py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl ring-1 ring-white/10 transition-all hover:border-gold/50" aria-label="Bottom landing navigation">
            <a href="#hero" className="flex flex-col items-center gap-0.5 text-[10px] text-gold transition hover:text-champagne">
              <span className="text-xl leading-none">⌂</span>
              <span>Home</span>
            </a>
            <a href="#features" className="flex flex-col items-center gap-0.5 text-[10px] text-gray-400 transition hover:text-white">
              <span className="text-xl leading-none">⚡</span>
              <span>Features</span>
            </a>
            <a href="#tournaments" className="flex flex-col items-center gap-0.5 text-[10px] text-gray-400 transition hover:text-white">
              <span className="text-xl leading-none">♜</span>
              <span>Tournaments</span>
            </a>
            <button type="button" onClick={onPlay} className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-gold transition hover:text-champagne">
              <span className="text-xl leading-none">♟</span>
              <span>Play</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
