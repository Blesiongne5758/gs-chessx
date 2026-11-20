import { supabase } from './supabaseClient';

export const USERNAME_RULE = /^[a-zA-Z0-9_]{3,20}$/;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB (before resize)
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const GUEST_KEY = 'gs-chessx-guest-profile';
const GUEST_DEFAULT = { username: 'Guest', avatar_url: null, rating: 1200, games_played: 0, wins: 0 };

export function validateUsername(name) {
  if (!name) return 'Username wajib diisi.';
  if (name.length < 3 || name.length > 20) return 'Username harus 3–20 karakter.';
  if (!USERNAME_RULE.test(name)) return 'Hanya huruf, angka, dan underscore (_).';
  return null;
}

export function validateAvatarFile(file) {
  if (!AVATAR_TYPES.includes(file.type)) return 'Format harus PNG, JPG, WEBP, atau GIF.';
  if (file.size > MAX_AVATAR_BYTES) return 'Ukuran file maksimal 2 MB.';
  return null;
}

/** Crop to a centered square and resize to 256×256 WebP to keep storage small. */
export function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas
        .getContext('2d')
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar.'))), 'image/webp', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('File gambar tidak valid.'));
    };
    img.src = objectUrl;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---------- Guest (localStorage) ----------
export function loadGuestProfile() {
  try {
    return { ...GUEST_DEFAULT, ...JSON.parse(localStorage.getItem(GUEST_KEY) || '{}') };
  } catch {
    return { ...GUEST_DEFAULT };
  }
}

function saveGuestProfile(patch) {
  const next = { ...loadGuestProfile(), ...patch };
  localStorage.setItem(GUEST_KEY, JSON.stringify(next));
  return next;
}

// ---------- Public API ----------
export async function fetchProfile(user) {
  if (user.isGuest) return loadGuestProfile();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) throw error;
  return data;
}

/**
 * Save username and/or avatar.
 * @param {object} user
 * @param {{ username: string, avatarBlob?: Blob|null, removeAvatar?: boolean, currentAvatarUrl?: string|null }} changes
 */
export async function updateProfile(user, { username, avatarBlob, removeAvatar, currentAvatarUrl }) {
  if (user.isGuest) {
    let avatar_url = currentAvatarUrl ?? null;
    if (removeAvatar) avatar_url = null;
    if (avatarBlob) avatar_url = await blobToDataUrl(avatarBlob);
    return saveGuestProfile({ username, avatar_url });
  }

  const patch = { username };

  if (avatarBlob) {
    // Unique filename busts CDN caches; folder = user id (enforced by storage RLS).
    const path = `${user.id}/avatar-${Date.now()}.webp`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, avatarBlob, { contentType: 'image/webp', upsert: false });
    if (upErr) throw upErr;
    patch.avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } else if (removeAvatar) {
    patch.avatar_url = null;
  }

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single();
  if (error) {
    if (error.code === '23505') throw new Error('Username sudah dipakai pemain lain.');
    throw error;
  }

  // Best-effort cleanup of the previous uploaded file
  if ((avatarBlob || removeAvatar) && currentAvatarUrl?.includes('/storage/v1/object/public/avatars/')) {
    const oldPath = currentAvatarUrl.split('/storage/v1/object/public/avatars/')[1];
    if (oldPath) supabase.storage.from('avatars').remove([decodeURIComponent(oldPath)]);
  }

  return data;
}
