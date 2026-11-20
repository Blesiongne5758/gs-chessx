export default function LandingPage({ onPlay, onLogin, onSignup, user }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 bg-graphite/50 backdrop-blur">
        <div className="text-3xl font-cinzel font-bold text-gold">♟️ GS-ChessX</div>
        <div className="flex gap-4">
          {user ? (
            <button
              onClick={onPlay}
              className="px-6 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne transition"
            >
              Play Now
            </button>
          ) : (
            <>
              <button onClick={onLogin} className="px-6 py-2 text-gray-300 hover:text-white">
                Login
              </button>
              <button
                onClick={onSignup}
                className="px-6 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne transition"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-gold mb-6">
            ⚔️ The Battle of Ideologies ⚔️
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8">Choose Your Side. Make Your Move.</p>

          {/* Chess Preview */}
          <div className="bg-graphite border-2 border-gold/30 rounded-xl p-8 mb-8">
            <div className="text-5xl md:text-8xl mb-4">♔♕♖♗♘♙</div>
            <div className="text-gray-400">Holy Kingdom vs Anarchy Rebellion</div>
          </div>

          <button
            onClick={onPlay}
            className="px-12 py-4 bg-gradient-to-r from-gold to-champagne text-obsidian font-bold text-xl rounded-lg hover:shadow-lg hover:shadow-gold/50 transition transform hover:scale-105"
          >
            ▶ PLAY NOW
          </button>

          {/* Stats (placeholder — hubungkan ke Supabase nanti) */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <Stat value="12,847" label="Players Online" />
            <Stat value="3,241" label="Games in Progress" />
            <Stat value="2h 15m" label="Next Tournament" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-graphite/30 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon="🎭" title="2D/3D Board" desc="Switch between classic and immersive modes" />
          <FeatureCard icon="🎙️" title="Voice Call" desc="Talk with opponents in real-time" />
          <FeatureCard icon="🤖" title="AI Opponent" desc="10 difficulty levels from beginner to GM" />
          <FeatureCard icon="🏆" title="Ranked Matches" desc="Compete and climb the leaderboard" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="bg-graphite/50 p-4 rounded-lg">
      <div className="text-3xl font-bold text-gold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-graphite border border-gold/20 rounded-lg p-6 text-center hover:border-gold/50 transition">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-gold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}
