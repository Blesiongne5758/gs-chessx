import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import { fetchProfile, updateProfile, validateUsername, validateAvatarFile, resizeImage } from '../lib/profile';

export default function EditProfile({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarBlob, setAvatarBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    fetchProfile(user)
      .then((p) => {
        setProfile(p);
        setUsername(p?.username || '');
      })
      .catch((e) => setError(e.message));
  }, [user]);

  // Release object URLs for previews
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const usernameError = username ? validateUsername(username) : null;
  const shownAvatar = removeAvatar ? null : previewUrl || profile?.avatar_url;
  const dirty = profile && (username !== profile.username || avatarBlob || (removeAvatar && profile.avatar_url));
  const rating = profile?.rating ?? 1200;
  const rank = rating >= 2400 ? 'Grandmaster' : rating >= 2200 ? 'Master' : rating >= 2000 ? 'Expert' : rating >= 1800 ? 'Advanced' : rating >= 1500 ? 'Club Player' : 'Apprentice';

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const blob = await resizeImage(file);
      setAvatarBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setRemoveAvatar(false);
    } catch (ex) {
      toast.error(ex.message);
    }
  }

  function handleRemove() {
    setAvatarBlob(null);
    setPreviewUrl(null);
    setRemoveAvatar(true);
  }

  function handleReset() {
    setUsername(profile.username);
    setAvatarBlob(null);
    setPreviewUrl(null);
    setRemoveAvatar(false);
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validateUsername(username);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(user, {
        username,
        avatarBlob,
        removeAvatar,
        currentAvatarUrl: profile.avatar_url,
      });
      setProfile(updated);
      setUsername(updated.username);
      setAvatarBlob(null);
      setPreviewUrl(null);
      setRemoveAvatar(false);
      toast.success('Profil berhasil disimpan.');
    } catch (ex) {
      setError(ex.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('Password minimal 8 karakter.');
    if (newPassword !== confirmPassword) return toast.error('Konfirmasi password tidak cocok.');
    setPasswordSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password berhasil diperbarui.');
    } catch (ex) {
      toast.error(ex.message || 'Gagal memperbarui password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian p-6">
      <nav className="flex justify-between items-center mb-8 max-w-3xl mx-auto">
        <button onClick={onBack} className="px-4 py-2 text-gray-300 hover:text-white">
          ← Back to Lobby
        </button>
        <div className="text-2xl font-cinzel font-bold text-gold">♟️ GS-ChessX</div>
      </nav>

      <div className="max-w-xl mx-auto bg-graphite border border-gold/30 rounded-xl p-8">
        <h1 className="text-2xl font-cinzel font-bold text-gold mb-1">Edit Profile</h1>
        <p className="text-sm text-gray-400 mb-6">
          {user.isGuest ? 'Mode tamu — perubahan disimpan di browser ini saja.' : 'Ubah username dan foto profil Anda.'}
        </p>
        {profile && <div className="mb-6 flex items-center justify-between rounded-xl border border-gold/25 bg-obsidian p-4"><div><div className="text-xs uppercase tracking-widest text-gray-500">Peringkat pemain</div><div className="mt-1 font-cinzel text-lg font-bold text-gold">{rank}</div></div><div className="text-right"><div className="text-xs text-gray-500">Rating</div><div className="text-2xl font-bold text-white">{rating}</div></div></div>}

        {!profile && !error ? (
          <div className="text-gray-400 text-center py-12">Memuat profil...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar name={username || profile?.username} url={shownAvatar} size="w-28 h-28 text-4xl" />
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFile}
                  className="hidden"
                  data-testid="avatar-input"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="px-4 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne transition"
                >
                  Upload Avatar
                </button>
                {shownAvatar && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="px-4 py-2 bg-slate text-gray-300 rounded hover:bg-gray-700"
                  >
                    Hapus Avatar
                  </button>
                )}
                <p className="text-xs text-gray-500">PNG, JPG, WEBP, atau GIF, maks. 2 MB. Dipotong persegi 256×256.</p>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-gray-300 text-sm mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                maxLength={20}
                className={`w-full px-4 py-2 bg-obsidian border rounded text-white focus:outline-none ${
                  usernameError ? 'border-crimson' : 'border-gray-700 focus:border-gold'
                }`}
                placeholder="username_anda"
              />
              <div className="flex justify-between mt-1 text-xs">
                <span className={usernameError ? 'text-crimson' : 'text-gray-500'}>
                  {usernameError || 'Huruf, angka, dan underscore. 3–20 karakter.'}
                </span>
                <span className="text-gray-500">{username.length}/20</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-600/20 border border-red-600 text-red-400 px-4 py-2 rounded text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!dirty || !!usernameError || saving}
                className="flex-1 py-3 bg-gold text-obsidian font-bold rounded hover:bg-champagne transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!dirty || saving}
                className="px-6 py-3 bg-slate text-gray-300 rounded hover:bg-gray-700 disabled:opacity-40"
              >
                Batal
              </button>
            </div>
          </form>
        )}
        {!user.isGuest && <section className="mt-8 border-t border-white/10 pt-6"><h2 className="font-cinzel text-lg font-bold text-gold">Keamanan akun</h2><p className="mb-4 mt-1 text-sm text-gray-400">Atur password baru untuk akun ini.</p><form onSubmit={handlePasswordSubmit} className="space-y-3"><label className="block text-sm text-gray-300">Password baru<input type="password" minLength={8} autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-obsidian px-4 py-2 text-white outline-none focus:border-gold" placeholder="Minimal 8 karakter" /></label><label className="block text-sm text-gray-300">Ulangi password baru<input type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-obsidian px-4 py-2 text-white outline-none focus:border-gold" placeholder="Konfirmasi password" /></label><button disabled={passwordSaving || !newPassword || !confirmPassword} className="w-full rounded bg-slate py-3 font-semibold text-white hover:bg-gray-700 disabled:opacity-40">{passwordSaving ? 'Memperbarui…' : 'Perbarui password'}</button></form></section>}
      </div>
    </div>
  );
}
