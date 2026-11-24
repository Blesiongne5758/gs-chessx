import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import TopNav, { FooterNav } from './TopNav';
import { fetchProfile, updateProfile, validateUsername, validateAvatarFile, resizeImage } from '../lib/profile';

export default function EditProfile({ user, onBack, onNavigate, onEditProfile, onLogout }) {
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
      toast.success('Profile saved successfully.');
    } catch (ex) {
      setError(ex.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return toast.error('Password confirmation does not match.');
    setPasswordSaving(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordError) throw passwordError;
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch (ex) {
      toast.error(ex.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      <TopNav active="profile" onNavigate={onNavigate} profile={{ username: profile?.username || username, avatar_url: profile?.avatar_url }} onEditProfile={onEditProfile} onLogout={onLogout} isAdmin={user?.isGuest} />
      <main className="mx-auto flex-1 w-full max-w-3xl px-4 py-8 pb-24 sm:pb-20 sm:px-6">
        <button onClick={onBack} className="mb-6 block text-left text-sm text-gray-300 hover:text-white">
          ← Back to Lobby
        </button>

        <div className="bg-graphite border border-gold/30 rounded-xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl font-cinzel font-bold text-gold mb-1">Edit Profile</h1>
        <p className="text-sm text-gray-400 mb-6">
          {user.isGuest ? 'Guest mode — changes are saved in this browser only.' : 'Update your username and profile picture.'}
        </p>
        {profile && <div className="mb-6 flex items-center justify-between rounded-xl border border-gold/25 bg-obsidian p-4"><div><div className="text-xs uppercase tracking-widest text-gray-500">Player Rank</div><div className="mt-1 font-cinzel text-lg font-bold text-gold">{rank}</div></div><div className="text-right"><div className="text-xs text-gray-500">Rating</div><div className="text-2xl font-bold text-white">{rating}</div></div></div>}

        {!profile && !error ? (
          <div className="text-gray-400 text-center py-12">Loading profile...</div>
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
                    Remove Avatar
                  </button>
                )}
                <p className="text-xs text-gray-500">PNG, JPG, WEBP, or GIF, max 2 MB. Cropped square 256×256.</p>
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
                placeholder="your_username"
              />
              <div className="flex justify-between mt-1 text-xs">
                <span className={usernameError ? 'text-crimson' : 'text-gray-500'}>
                  {usernameError || 'Letters, numbers, and underscores. 3–20 characters.'}
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!dirty || saving}
                className="px-6 py-3 bg-slate text-gray-300 rounded hover:bg-gray-700 disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {!user.isGuest && <section className="mt-8 border-t border-white/10 pt-6"><h2 className="font-cinzel text-lg font-bold text-gold">Account Security</h2><p className="mb-4 mt-1 text-sm text-gray-400">Set a new password for this account.</p><form onSubmit={handlePasswordSubmit} className="space-y-3"><label className="block text-sm text-gray-300">New password<input type="password" minLength={8} autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-obsidian px-4 py-2 text-white outline-none focus:border-gold" placeholder="Minimum 8 characters" /></label><label className="block text-sm text-gray-300">Confirm new password<input type="password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-obsidian px-4 py-2 text-white outline-none focus:border-gold" placeholder="Confirm password" /></label><button disabled={passwordSaving || !newPassword || !confirmPassword} className="w-full rounded bg-slate py-3 font-semibold text-white hover:bg-gray-700 disabled:opacity-40">{passwordSaving ? 'Updating…' : 'Update Password'}</button></form></section>}
        </div>
      </main>
      <FooterNav active="profile" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
