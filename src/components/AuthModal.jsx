import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

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
          options: { data: { username: username || email.split('@')[0] } },
        });
        if (err) throw err;
        if (!data.session) {
          toast.success('Cek email Anda untuk konfirmasi akun.');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50 p-4">
      <div className="bg-graphite border-2 border-gold rounded-xl max-w-md w-full p-8">
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
            className="w-full py-3 bg-gold text-obsidian font-bold rounded hover:bg-champagne transition disabled:opacity-50"
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

        <div className="mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={handleGoogle}
            className="w-full py-2 bg-slate text-gray-300 rounded hover:bg-gray-700 flex items-center justify-center gap-2"
          >
            <span>🔵</span> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
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
