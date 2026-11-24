import { useState } from 'react';
import toast from 'react-hot-toast';
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabaseClient';

export default function AuthModal({ onClose, initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) throw new Error(supabaseConfigError || 'Supabase configuration is not ready.');
      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        // The profile row is created by the `handle_new_user` trigger (supabase/schema.sql),
        // which reads the username from user metadata. This works even when email
        // confirmation is enabled and the user has no session yet (RLS-safe).
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/?email-confirmed=1`,
          },
        });
        if (err) throw err;
        if (data.session) toast.success('Account created successfully. Enjoy playing!');
        else toast.success('Account created. Email confirmation is required, please check your inbox.');
        onClose();
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12141a] border border-gold/40 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl shadow-black/80">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gold font-cinzel">{isLogin ? 'Welcome Back' : 'Join the Battle'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <Field label="Username">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="Your username"
                minLength={3}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="your@email.com"
              required
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </Field>

          {error && <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-2 rounded text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-gold to-champagne text-obsidian font-bold rounded-lg hover:shadow-lg hover:shadow-gold/25 transition disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>

          <div className="text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-gold hover:underline">
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatAuthError(error) {
  const message = String(error?.message || error || 'Login failed.');
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid api key') || normalized.includes('apikey')) {
    return 'Invalid Supabase API key. Please verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in GitHub Actions secrets and redeploy.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Email not confirmed yet. Disable "Confirm email" in Supabase Authentication → Providers → Email, or confirm the verification email in your inbox.';
  }
  return message;
}

const inputClass =
  'w-full px-4 py-2 bg-obsidian border border-gray-700 rounded text-white focus:border-gold focus:outline-none';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-gray-300 text-sm mb-2">{label}</label>
      {children}
    </div>
  );
}
